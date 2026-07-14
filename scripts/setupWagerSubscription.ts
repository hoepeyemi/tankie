/**
 * Setup script for Wager Match Reactivity subscription.
 * Run this ONCE after deploying BlastWager.
 *
 * This tells Somnia validators to invoke BlastWager when BlastWager itself
 * emits a WagerScoreSubmitted event. (Self-reactivity)
 *
 * Usage:
 *   npx tsx scripts/setupWagerSubscription.ts 0xYOUR_PRIVATE_KEY
 */

import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, createWalletClient, http, defineChain, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================
// CONTRACT ADDRESSES
// ============================================
// Replace this with the deployed BlastWager contract address
const BLAST_WAGER_ADDRESS = '0x6be14c9c3191dF902973124cF61349613397207B';

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
        console.error('❌ Usage: npx tsx scripts/setupWagerSubscription.ts YOUR_PRIVATE_KEY');
        process.exit(1);
    }
    if (!pk.startsWith('0x')) pk = '0x' + pk;

    const account = privateKeyToAccount(pk as `0x${string}`);
    console.log('Wallet:', account.address);

    const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
    const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() });

    const sdk = new SDK({ public: publicClient, wallet: walletClient });

    console.log('Creating Wager Match Reactivity subscription...');
    console.log('  Emitter (Self):', BLAST_WAGER_ADDRESS);
    console.log('  Handler (Self):', BLAST_WAGER_ADDRESS);

    // BlastWager listens to its own events!
    const txHash = await sdk.createSoliditySubscription({
        emitter: BLAST_WAGER_ADDRESS as `0x${string}`,
        handlerContractAddress: BLAST_WAGER_ADDRESS as `0x${string}`,
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

    console.log('✅ Wager Subscription created! Tx:', txHash);
}

main().catch(console.error);
