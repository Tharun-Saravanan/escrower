const hre = require("hardhat");

// ─── PUT YOUR DEPLOYED CONTRACT ADDRESS HERE ───────────────────
const CONTRACT_ADDRESS = "0xfB49C354476Da798FE3334B69469a48D31cC2950";
// ────────────────────────────────────────────────────────────────

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Connected as:", signer.address);

  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "SHM\n");

  const escrow = await hre.ethers.getContractAt("Escrow", CONTRACT_ADDRESS);
  const dealCount = await escrow.dealCount();
  console.log("Total deals created:", dealCount.toString());

  // ─── DEMO: Create a deal, confirm, and release ──────────────
  // Replace this seller address with a real one for actual use
  const DEMO_SELLER = "0x000000000000000000000000000000000000dEaD";
  const DEPOSIT = hre.ethers.parseEther("0.01"); // 0.01 SHM

  // 1. Create deal
  console.log("\n--- Creating deal (0.01 SHM) ---");
  const createTx = await escrow.createDeal(DEMO_SELLER, { value: DEPOSIT });
  const receipt = await createTx.wait();
  const dealId = dealCount; // the new deal ID
  console.log("Deal created! ID:", dealId.toString());
  console.log("Tx hash:", receipt.hash);

  // 2. Read deal info
  const deal = await escrow.getDeal(dealId);
  console.log("\nDeal details:");
  console.log("  Buyer:", deal.buyer);
  console.log("  Seller:", deal.seller);
  console.log("  Amount:", hre.ethers.formatEther(deal.amount), "SHM");
  console.log("  Buyer confirmed:", deal.buyerConfirmed);
  console.log("  Seller confirmed:", deal.sellerConfirmed);
  console.log("  Status:", ["AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED", "REFUNDED"][Number(deal.status)]);

  // 3. Buyer confirms
  console.log("\n--- Buyer confirming ---");
  const confirmTx = await escrow.confirm(dealId);
  await confirmTx.wait();
  console.log("Buyer confirmed!");

  // 4. Check updated status
  const updated = await escrow.getDeal(dealId);
  console.log("  Buyer confirmed:", updated.buyerConfirmed);
  console.log("  Seller confirmed:", updated.sellerConfirmed);
  console.log("  Status:", ["AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED", "REFUNDED"][Number(updated.status)]);

  console.log("\n--- Demo complete ---");
  console.log("Note: Seller must also call confirm() from their wallet.");
  console.log("      Then buyer calls releaseFunds() to pay the seller.");
  console.log(`\nView on explorer: https://explorer-mezame.shardeum.org/address/${CONTRACT_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
