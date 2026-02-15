// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Escrow
 * @notice Trustless escrow contract — funds are locked until both buyer and
 *         seller confirm the transaction. Either party can also trigger a
 *         refund before the other side has confirmed.
 *
 *         Flow:
 *           1. Buyer creates an escrow by depositing ETH and naming a seller.
 *           2. Both buyer and seller call `confirm()`.
 *           3. Once both have confirmed, the seller can `releaseFunds()`.
 *           4. Before both confirmations, the buyer may `refund()`.
 */
contract Escrow {
    // ─── State ────────────────────────────────────────────────────────

    enum Status {
        AWAITING_CONFIRMATION, // funds deposited, waiting for both confirms
        CONFIRMED,             // both parties confirmed
        COMPLETED,             // funds released to seller
        REFUNDED               // funds returned to buyer
    }

    struct Deal {
        address payable buyer;
        address payable seller;
        uint256 amount;
        bool buyerConfirmed;
        bool sellerConfirmed;
        Status status;
    }

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;

    // ─── Events ───────────────────────────────────────────────────────

    event DealCreated(
        uint256 indexed dealId,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );
    event Confirmed(uint256 indexed dealId, address indexed party);
    event FundsReleased(uint256 indexed dealId, uint256 amount);
    event Refunded(uint256 indexed dealId, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────

    modifier onlyBuyer(uint256 _dealId) {
        require(msg.sender == deals[_dealId].buyer, "Not the buyer");
        _;
    }

    modifier onlySeller(uint256 _dealId) {
        require(msg.sender == deals[_dealId].seller, "Not the seller");
        _;
    }

    modifier onlyParty(uint256 _dealId) {
        Deal storage d = deals[_dealId];
        require(
            msg.sender == d.buyer || msg.sender == d.seller,
            "Not a party to this deal"
        );
        _;
    }

    modifier inStatus(uint256 _dealId, Status _status) {
        require(deals[_dealId].status == _status, "Invalid deal status");
        _;
    }

    // ─── Core Functions ───────────────────────────────────────────────

    /**
     * @notice Create a new escrow deal by depositing funds.
     * @param _seller Address of the seller / service provider.
     * @return dealId The ID of the newly created deal.
     */
    function createDeal(address payable _seller)
        external
        payable
        returns (uint256 dealId)
    {
        require(msg.value > 0, "Must deposit ETH");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller must differ");

        dealId = dealCount++;

        deals[dealId] = Deal({
            buyer: payable(msg.sender),
            seller: _seller,
            amount: msg.value,
            buyerConfirmed: false,
            sellerConfirmed: false,
            status: Status.AWAITING_CONFIRMATION
        });

        emit DealCreated(dealId, msg.sender, _seller, msg.value);
    }

    /**
     * @notice Buyer or seller confirms that the deal terms are satisfied.
     * @param _dealId The ID of the deal to confirm.
     */
    function confirm(uint256 _dealId)
        external
        onlyParty(_dealId)
        inStatus(_dealId, Status.AWAITING_CONFIRMATION)
    {
        Deal storage d = deals[_dealId];

        if (msg.sender == d.buyer) {
            require(!d.buyerConfirmed, "Buyer already confirmed");
            d.buyerConfirmed = true;
        } else {
            require(!d.sellerConfirmed, "Seller already confirmed");
            d.sellerConfirmed = true;
        }

        emit Confirmed(_dealId, msg.sender);

        if (d.buyerConfirmed && d.sellerConfirmed) {
            d.status = Status.CONFIRMED;
        }
    }

    /**
     * @notice Release escrowed funds to the seller.
     *         Can only be called after both parties confirm.
     * @param _dealId The ID of the deal.
     */
    function releaseFunds(uint256 _dealId)
        external
        onlyBuyer(_dealId)
        inStatus(_dealId, Status.CONFIRMED)
    {
        Deal storage d = deals[_dealId];
        d.status = Status.COMPLETED;

        uint256 payout = d.amount;
        d.amount = 0;

        (bool sent, ) = d.seller.call{value: payout}("");
        require(sent, "Transfer to seller failed");

        emit FundsReleased(_dealId, payout);
    }

    /**
     * @notice Refund escrowed funds back to the buyer.
     *         Only allowed while still awaiting confirmations.
     * @param _dealId The ID of the deal.
     */
    function refund(uint256 _dealId)
        external
        onlyBuyer(_dealId)
        inStatus(_dealId, Status.AWAITING_CONFIRMATION)
    {
        Deal storage d = deals[_dealId];
        d.status = Status.REFUNDED;

        uint256 refundAmount = d.amount;
        d.amount = 0;

        (bool sent, ) = d.buyer.call{value: refundAmount}("");
        require(sent, "Refund to buyer failed");

        emit Refunded(_dealId, refundAmount);
    }

    // ─── View Helpers ─────────────────────────────────────────────────

    /**
     * @notice Get full details of a deal.
     */
    function getDeal(uint256 _dealId)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 amount,
            bool buyerConfirmed,
            bool sellerConfirmed,
            Status status
        )
    {
        Deal storage d = deals[_dealId];
        return (
            d.buyer,
            d.seller,
            d.amount,
            d.buyerConfirmed,
            d.sellerConfirmed,
            d.status
        );
    }
}
