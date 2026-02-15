const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  let escrow, buyer, seller, other;

  beforeEach(async () => {
    [buyer, seller, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();
  });

  // ── Deal creation ────────────────────────────────────────────

  describe("createDeal", () => {
    it("should create a deal and lock funds", async () => {
      const tx = await escrow
        .connect(buyer)
        .createDeal(seller.address, { value: ethers.parseEther("1") });

      await expect(tx)
        .to.emit(escrow, "DealCreated")
        .withArgs(0, buyer.address, seller.address, ethers.parseEther("1"));

      const deal = await escrow.getDeal(0);
      expect(deal.buyer).to.equal(buyer.address);
      expect(deal.seller).to.equal(seller.address);
      expect(deal.amount).to.equal(ethers.parseEther("1"));
      expect(deal.status).to.equal(0); // AWAITING_CONFIRMATION
    });

    it("should reject zero-value deals", async () => {
      await expect(
        escrow.connect(buyer).createDeal(seller.address, { value: 0 })
      ).to.be.revertedWith("Must deposit ETH");
    });

    it("should reject seller == buyer", async () => {
      await expect(
        escrow
          .connect(buyer)
          .createDeal(buyer.address, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Buyer and seller must differ");
    });
  });

  // ── Confirmation ─────────────────────────────────────────────

  describe("confirm", () => {
    beforeEach(async () => {
      await escrow
        .connect(buyer)
        .createDeal(seller.address, { value: ethers.parseEther("1") });
    });

    it("buyer can confirm", async () => {
      await expect(escrow.connect(buyer).confirm(0))
        .to.emit(escrow, "Confirmed")
        .withArgs(0, buyer.address);
    });

    it("seller can confirm", async () => {
      await expect(escrow.connect(seller).confirm(0))
        .to.emit(escrow, "Confirmed")
        .withArgs(0, seller.address);
    });

    it("both confirms set status to CONFIRMED", async () => {
      await escrow.connect(buyer).confirm(0);
      await escrow.connect(seller).confirm(0);
      const deal = await escrow.getDeal(0);
      expect(deal.status).to.equal(1); // CONFIRMED
    });

    it("non-party cannot confirm", async () => {
      await expect(escrow.connect(other).confirm(0)).to.be.revertedWith(
        "Not a party to this deal"
      );
    });

    it("buyer cannot confirm twice", async () => {
      await escrow.connect(buyer).confirm(0);
      await expect(escrow.connect(buyer).confirm(0)).to.be.revertedWith(
        "Buyer already confirmed"
      );
    });
  });

  // ── Fund release ─────────────────────────────────────────────

  describe("releaseFunds", () => {
    beforeEach(async () => {
      await escrow
        .connect(buyer)
        .createDeal(seller.address, { value: ethers.parseEther("1") });
      await escrow.connect(buyer).confirm(0);
      await escrow.connect(seller).confirm(0);
    });

    it("buyer can release funds to seller", async () => {
      const before = await ethers.provider.getBalance(seller.address);
      const tx = await escrow.connect(buyer).releaseFunds(0);
      await expect(tx)
        .to.emit(escrow, "FundsReleased")
        .withArgs(0, ethers.parseEther("1"));

      const after = await ethers.provider.getBalance(seller.address);
      expect(after - before).to.equal(ethers.parseEther("1"));

      const deal = await escrow.getDeal(0);
      expect(deal.status).to.equal(2); // COMPLETED
    });

    it("seller cannot release funds", async () => {
      await expect(
        escrow.connect(seller).releaseFunds(0)
      ).to.be.revertedWith("Not the buyer");
    });
  });

  // ── Refund ───────────────────────────────────────────────────

  describe("refund", () => {
    beforeEach(async () => {
      await escrow
        .connect(buyer)
        .createDeal(seller.address, { value: ethers.parseEther("1") });
    });

    it("buyer can refund before both confirmations", async () => {
      const before = await ethers.provider.getBalance(buyer.address);
      const tx = await escrow.connect(buyer).refund(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(escrow, "Refunded")
        .withArgs(0, ethers.parseEther("1"));

      const after = await ethers.provider.getBalance(buyer.address);
      expect(after + gasCost - before).to.equal(ethers.parseEther("1"));

      const deal = await escrow.getDeal(0);
      expect(deal.status).to.equal(3); // REFUNDED
    });

    it("cannot refund after both confirmations", async () => {
      await escrow.connect(buyer).confirm(0);
      await escrow.connect(seller).confirm(0);
      await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith(
        "Invalid deal status"
      );
    });
  });
});
