/**
 * Setup script for on-chain Reactivity subscription.
 * Run this ONCE after deploying BlastRewarder to create the subscription
 * that tells Somnia validators to invoke BlastRewarder when ScoreSubmitted fires.
 *
 * Usage:
 *   1. Add your private key to .env: PRIVATE_KEY=abc123...
 *   2. Run: npx tsx scripts/setupReactivitySubscription.ts
 */

import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, createWalletClient, http, defineChain, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================
// CONTRACT ADDRESSES
// ============================================
const BLAST_REWARDER_ADDRESS = '0x1AaaD8e892e8898f32CB2C2beB45Fa713d622907';
const LEADERBOARD_CONTRACT_ADDRESS = '0xc70343667d292c3393491c4008e1bDd7cfe0D495';

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
    // Get private key from command line argument
    let pk = process.argv[2];
    if (!pk) {
        console.error('❌ Usage: npx tsx scripts/setupReactivitySubscription.ts YOUR_PRIVATE_KEY');
        process.exit(1);
    }

    // Ensure 0x prefix
    if (!pk.startsWith('0x')) {
        pk = '0x' + pk;
    }

    const account = privateKeyToAccount(pk as `0x${string}`);
    console.log('Wallet:', account.address);

    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http(),
    });

    const sdk = new SDK({
        public: publicClient,
        wallet: walletClient,
    });

    console.log('Creating on-chain Reactivity subscription...');
    console.log('  Leaderboard (emitter):', LEADERBOARD_CONTRACT_ADDRESS);
    console.log('  BlastRewarder (handler):', BLAST_REWARDER_ADDRESS);

    const txHash = await sdk.createSoliditySubscription({
        emitter: LEADERBOARD_CONTRACT_ADDRESS as `0x${string}`,
        handlerContractAddress: BLAST_REWARDER_ADDRESS as `0x${string}`,
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

    console.log('✅ Subscription created! Tx:', txHash);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Transfer $BLAST tokens to the BlastRewarder contract');
    console.log('  2. Play a match and verify tokens arrive in your wallet!');
}

main().catch(console.error);
