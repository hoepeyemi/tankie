/**
 * Setup script for Dynamic Skin Pricing Reactivity subscription.
 * Run this ONCE after deploying BlastSkins.
 *
 * This tells Somnia validators to invoke BlastSkins when BlastSkins itself
 * emits a SkinUnlocked event. (Self-reactivity for dynamic pricing)
 *
 * Usage:
 *   npx tsx scripts/setupSkinSubscription.ts 0xYOUR_PRIVATE_KEY
 */

import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, createWalletClient, http, defineChain, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================
// CONTRACT ADDRESSES
// ============================================
// Replace this with the newly deployed BlastSkins contract address
const BLAST_SKINS_ADDRESS = '0xCA3E4d110E33A89dC369e8cA9FD73290e18241Df';

// ============================================

const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'testnet',
    nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
    rpcUrls: {
        default: {
            http: ['https://dream-rpc.somnia.network'],
        },
        public: {
            http: ['https://dream-rpc.somnia.network'],
        },
    },
});

async function main() {
    let pk = process.argv[2] || process.env.PRIVATE_KEY;
    if (!pk) {
        console.error('❌ Usage: npx tsx scripts/setupSkinSubscription.ts YOUR_PRIVATE_KEY');
        process.exit(1);
    }
    if (!pk.startsWith('0x')) pk = '0x' + pk;

    const account = privateKeyToAccount(pk as `0x${string}`);
    console.log('Wallet:', account.address);

    const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
    const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() });

    const sdk = new SDK({ public: publicClient, wallet: walletClient });

    console.log('Creating Skin Economy Reactivity subscription...');
    console.log('  Emitter (Self):', BLAST_SKINS_ADDRESS);
    console.log('  Handler (Self):', BLAST_SKINS_ADDRESS);

    // BlastSkins listens to its own SkinUnlocked events!
    const txHash = await sdk.createSoliditySubscription({
        emitter: BLAST_SKINS_ADDRESS as `0x${string}`,
        handlerContractAddress: BLAST_SKINS_ADDRESS as `0x${string}`,
        priorityFeePerGas: parseGwei('0'),
        maxFeePerGas: parseGwei('10'),
        gasLimit: 2_000_000n,
        isGuaranteed: true,
        isCoalesced: false,
    });

    if (txHash instanceof Error) {
        console.error('Failed to create subscription:', txHash.message);
        process.exit(1);
    }

    console.log('✅ Skin Pricing Subscription created! Tx:', txHash);
}

main().catch(console.error);
