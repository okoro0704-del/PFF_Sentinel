import { createThirdwebClient, getContract, sendAndConfirmTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { mintTo } from "thirdweb/extensions/erc721";
import { privateKeyToAccount } from "thirdweb/wallets";
import 'dotenv/config';

async function runGenesisPulse() {
const client = createThirdwebClient({
secretKey: process.env.THIRDWEB_SECRET_KEY as string
});

}

runGenesisPulse();