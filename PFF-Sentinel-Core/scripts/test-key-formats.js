/**
 * Test different private key formats to find the correct one
 */

import { ethers } from "ethers";

const privateKey = "4cfc678b4ae455c0b44b5b25ebd221be5749935a33017b4c1649e6cc63a48492";
const expectedAddress = "0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd";

console.log("🔍 Testing Private Key Formats...\n");
console.log("Expected Address:", expectedAddress);
console.log("Private Key:", privateKey);
console.log("\n" + "=".repeat(80) + "\n");

// Test 1: Without 0x prefix
try {
  const wallet1 = new ethers.Wallet(privateKey);
  console.log("✅ Test 1 - Without 0x prefix:");
  console.log("   Derived Address:", wallet1.address);
  console.log("   Match:", wallet1.address.toLowerCase() === expectedAddress.toLowerCase() ? "✅ YES" : "❌ NO");
} catch (error) {
  console.log("❌ Test 1 - Failed:", error.message);
}

console.log("\n" + "-".repeat(80) + "\n");

// Test 2: With 0x prefix
try {
  const wallet2 = new ethers.Wallet("0x" + privateKey);
  console.log("✅ Test 2 - With 0x prefix:");
  console.log("   Derived Address:", wallet2.address);
  console.log("   Match:", wallet2.address.toLowerCase() === expectedAddress.toLowerCase() ? "✅ YES" : "❌ NO");
} catch (error) {
  console.log("❌ Test 2 - Failed:", error.message);
}

console.log("\n" + "=".repeat(80) + "\n");

// Let's also check what address the private key actually derives to
const actualWallet = new ethers.Wallet(privateKey);
console.log("📊 Summary:");
console.log("   Private Key:", privateKey);
console.log("   Derives To:", actualWallet.address);
console.log("   Expected:", expectedAddress);
console.log("   Match:", actualWallet.address.toLowerCase() === expectedAddress.toLowerCase() ? "✅ MATCH" : "❌ MISMATCH");

// Check on Polygonscan
console.log("\n🔗 Verify on Polygonscan:");
console.log("   Expected Address:", `https://polygonscan.com/address/${expectedAddress}`);
console.log("   Derived Address:", `https://polygonscan.com/address/${actualWallet.address}`);
console.log("\n💡 Check which address owns the VIDA Token contract:");
console.log("   https://polygonscan.com/address/0xDc6EFba149b47f6F6d77AC0523c51F204964C12E#readContract");
console.log("   Call the 'owner()' function to see the actual owner address.");

