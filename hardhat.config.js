require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    shardeum: {
      url: "https://api-mezame.shardeum.org",
      chainId: 8119,
      accounts: [PRIVATE_KEY],
    },
  },
};
