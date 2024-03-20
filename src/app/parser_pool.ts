import { Connection, ParsedInnerInstruction, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { BN } from "bn.js";
import { Metaplex } from '@metaplex-foundation/js';
import { PoolModel, TokenModel, PoolDetectionMessage, Pool, PoolCreationTx } from "@types";
import { Idl } from "@coral-xyz/anchor";
const RAYDIUM_AUTHORITY_V4 = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
const RAYDIUM_LIQUIDITY_POOL_V4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
import { LiquidityPoolKeysV4, MARKET_STATE_LAYOUT_V3, Market, TOKEN_PROGRAM_ID } from '"@raydium-io/raydium-sdk";'
import Log from "../lib/logger.js";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
// const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;

/**
 * Parse information about a pool.
 */
class PoolInfoGatherer {
    private static instance: PoolInfoGatherer | null = null;
    private connection: Connection | null = null;
    private coder: RaydiumAmmCoder | null = null;
    private metaPlex: Metaplex | null = null;

    private constructor() {
        this.connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
        this.metaPlex = Metaplex.make(this.connection);
        this.coder = new RaydiumAmmCoder(IDL as Idl);
    }

    /**
     * Gets the singleton instance of the PoolInfoGatherer.
     * @returns {PoolInfoGatherer} Instance of PoolInfoGatherer.
     */
    public static getInstance(): PoolInfoGatherer {
        if (this.instance === null) {
            this.instance = new PoolInfoGatherer();
        }
        return this.instance;
    }

    public parsePoolInfo(poolInfo: any, tokenFromPool: any, tx: any, SOL_TOKEN_ACCOUNT: any) {
        const poolObj: Pool = {
            pool_account: poolInfo.poolAccount,
            pool_mint_signature: tx.transaction.signatures[0],
            block_time: Number(tx.blockTime) * 1000,
            lp_amount: poolInfo.lpAmount,
            pair_details: {
                token_coin: poolInfo.tokenCoin,
                token_pc: poolInfo.tokenPc,
                coin_decimals: Number(poolInfo.coinDecimals),
                pc_decimals: Number(poolInfo.pcDecimals),
                coin_amount: poolInfo.coinAmount,
                pc_amount: poolInfo.pcAmount,
                coin_mint: poolInfo.coinMint,
                pc_mint: poolInfo.pcMint,
                lp_mint: poolInfo.lpMint,
                open_orders: poolInfo.openOrders,
                market: poolInfo.market,
                serum_dex: poolInfo.serumDex,
                target_orders: poolInfo.targetOrders,
                amm_owner: poolInfo.ammOwner,
                swap_take_coin_fee: poolInfo.outPut.swapTakeCoinFee,
                fees: {
                    min_separate_denominator: poolInfo.fees.minSeparateDenominator,
                    min_separate_numerator: poolInfo.fees.minSeparateNumerator,
                    trade_fee_denominator: poolInfo.fees.tradeFeeDenominator,
                    trade_fee_numerator: poolInfo.fees.tradeFeeNumerator,
                    pnl_denominator: poolInfo.fees.pnlDenominator,
                    pnl_numerator: poolInfo.fees.pnlNumerator,
                    swap_fee_denominator: poolInfo.fees.swapFeeDenominator,
                    swap_fee_numerator: poolInfo.fees.swapFeeNumerator,
                },
                SOL_TOKEN_ACCOUNT: SOL_TOKEN_ACCOUNT ? SOL_TOKEN_ACCOUNT : '',
            },
            pool_open_time: poolInfo.outPut.poolOpenTime,
            token: {
                name: tokenFromPool.name,
                symbol: tokenFromPool.symbol,
                address: tokenFromPool.address,
                supply: tokenFromPool.supply,
                description: tokenFromPool.description,
                creator_site: tokenFromPool.creator_site,
            },
            first_swap_at: 0,
            first_swap_block: 0,
            pool_creator: '',
            analysis: null,
            status: 'waiting_for_analysis',
            error: ""
        };
        return poolObj;
    }

    /**
     * Gathers and processes pool information.
     */
    public async poolInfoGatherer(txData: PoolCreationTx): Promise<{ poolObj: Pool, token: TokenModel; lpKeys: LiquidityPoolKeysV4; } | null> {
        const tx = txData.tx;
        const poolInfo = await this.getPoolInfo(txData.poolAddress);
        Log.info('pool info ' + poolInfo);
        let SOL_TOKEN_ACCOUNT;
        let tokenAddress;

        const LpKeys = await this.getLPkeys(tx);
        if (!LpKeys) return null;

        if (poolInfo) {
            if (poolInfo.pcMint === 'So11111111111111111111111111111111111111112') {
                SOL_TOKEN_ACCOUNT = poolInfo.tokenPc;
                tokenAddress = poolInfo.coinMint;
            } else {
                tokenAddress = poolInfo.pcMint;
                SOL_TOKEN_ACCOUNT = poolInfo?.tokenCoin;
            }

            let tokenFromPool;
            try {
                tokenFromPool = await this.getTokenInfo(tokenAddress);
            } catch (error) {
                Log.error("Failed to get token info from Metaplex");
                return null;
            }

            if (tokenFromPool) {
                try {
                    const tokenAddress = poolInfo.coinMint;
                    const baseTokenAddress = poolInfo.pcMint;
                    const token = await this.getTokenInfo(tokenAddress);
                    const base = await this.getTokenInfo(baseTokenAddress);
                    let poolObj = this.parsePoolInfo(poolInfo, tokenFromPool, tx, SOL_TOKEN_ACCOUNT);
                    return { poolObj: poolObj, token: token, lpKeys: LpKeys };
                } catch (error) {
                    Log.error("Failed to add pool to DB");
                    return null;
                }
            } else return null;
        } else return null;
    }


    public async getLPkeys(tx: ParsedTransactionWithMeta): Promise<LiquidityPoolKeysV4 | null> {
        const lpInfo = this.parsePoolInfoFromLpTransaction(tx);
        if (!lpInfo) return null;

        const marketInfo = await this.fetchMarketInfo(lpInfo.marketId);
        if (!marketInfo) return null;

        const LpKeys: LiquidityPoolKeysV4 = {
            id: lpInfo.id,
            baseMint: lpInfo.baseMint,
            quoteMint: lpInfo.quoteMint,
            lpMint: lpInfo.lpMint,
            baseDecimals: lpInfo.baseDecimals,
            quoteDecimals: lpInfo.quoteDecimals,
            lpDecimals: lpInfo.lpDecimals,
            version: 4,
            programId: lpInfo.programId,
            authority: lpInfo.authority,
            openOrders: lpInfo.openOrders,
            targetOrders: lpInfo.targetOrders,
            baseVault: lpInfo.baseVault,
            quoteVault: lpInfo.quoteVault,
            withdrawQueue: lpInfo.withdrawQueue,
            lpVault: lpInfo.lpVault,
            marketVersion: 3,
            marketProgramId: lpInfo.marketProgramId,
            marketId: lpInfo.marketId,
            marketAuthority: Market.getAssociatedAuthority({ programId: lpInfo.marketProgramId, marketId: lpInfo.marketId }).publicKey,
            marketBaseVault: marketInfo.baseVault,
            marketQuoteVault: marketInfo.quoteVault,
            marketBids: marketInfo.bids,
            marketAsks: marketInfo.asks,
            marketEventQueue: marketInfo.eventQueue,
        } as LiquidityPoolKeysV4;

        return LpKeys;
    }

    /**
     Decodes pool account information using Raydium IDL.
     * @param {string} address - The pool account address.
     * @param {number} time - The time at which the pool information is being fetched.
     * @returns {Promise<PoolModel | null>} The decoded pool model or null.
     */
    public async getPoolInfo(address: string): Promise<PoolModel | null> {
        const acc = await this.connection!.getAccountInfo(new PublicKey(address));
        if (acc) {
            const result = this.coder!.accounts.decode('ammInfo', acc.data);
            if (result.lpAmount.toNumber() === 0) return null;
            const parsed = this.parseBnValues(result);
            parsed.poolAccount = address;
            return parsed;
        } else {
            Log.error("Failed to get pool info");
            return null;
        }
    }


    /**
     * Retrieves token information using Metaplex.
     * @param {string} address - The token address.
     * @returns {Promise<TokenModel>} The token model.
     */
    public async getTokenInfo(address: string): Promise<TokenModel> {
        const mintAddress = new PublicKey(address);
        const metadataPda = this.metaPlex!.nfts().pdas().metadata({ mint: mintAddress });
        const metadataAccountInfo = await this.connection!.getAccountInfo(metadataPda);

        if (metadataAccountInfo) {
            const token = await this.metaPlex!.nfts().findByMint({ mintAddress: mintAddress });
            const tokenObj: TokenModel = {
                name: token.name,
                symbol: token.symbol,
                address: address,
                supply: token.mint.supply.basisPoints.toString(),
                description: '',
                creator_name: 'null',
                creator_site: token.uri,
            };
            if (token.json) {
                if (token.json.description) tokenObj.description = token.json.description;
            }
            return tokenObj;
        } else {
            const tokenObj: TokenModel = {
                name: "",
                symbol: '',
                address: "",
                supply: "",
                description: "",
                creator_name: 'null',
                creator_site: "",
            };
            return tokenObj;
        }
    }

    /**
     * Parses values in an object that contains BN (BigNumber) or PublicKey instances.
     * @param {any} obj - The object to parse.
     * @returns {any} The parsed object.
     */
    private parseBnValues(obj: any): any {
        const parsedObj: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];

                if (value instanceof PublicKey) {
                    // PublicKey -> base58 string
                    parsedObj[key] = value.toBase58();
                } else if (value instanceof BN) {
                    // BN -> string
                    parsedObj[key] = value.toString();
                } else if (typeof value === 'object' && value !== null) {
                    // Recursively parse object properties
                    parsedObj[key] = this.parseBnValues(value);
                } else {
                    parsedObj[key] = value;
                }
            }
        }
        return parsedObj;
    }

    /**
     * Get Liquidity Market data info.
     * Ref: https://gist.github.com/endrsmar/684c336c3729ec4472b2f337c50c3cdb
     */
    private async fetchMarketInfo(marketId: PublicKey) {
        if (!this.connection) return false;
        const marketAccountInfo = await this.connection.getAccountInfo(marketId);
        if (!marketAccountInfo) {
            Log.error('Failed to fetch market info for market id ' + marketId.toBase58());
            return false;
        }
        return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
    }


    /**
    * Get Liquidity Pool information from a parsed transaction.
    * Ref: https://gist.github.com/endrsmar/684c336c3729ec4472b2f337c50c3cdb
    */
    private parsePoolInfoFromLpTransaction(txData: ParsedTransactionWithMeta) {
        const initInstruction = this.findInstructionByProgramId(txData.transaction.message.instructions, new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as PartiallyDecodedInstruction | null;
        if (!initInstruction) {
            Log.error('Failed to find lp init instruction in lp init tx');
            return false;
        }
        const baseMint = initInstruction.accounts[8];
        const baseVault = initInstruction.accounts[10];
        const quoteMint = initInstruction.accounts[9];
        const quoteVault = initInstruction.accounts[11];
        const lpMint = initInstruction.accounts[7];
        const baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
        const lpMintInitInstruction = this.findInitializeMintInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
        if (!lpMintInitInstruction) {
            Log.error('Failed to find lp mint init instruction in lp init tx');
            return false;
        }
        const lpMintInstruction = this.findMintToInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
        if (!lpMintInstruction) {
            Log.error('Failed to find lp mint to instruction in lp init tx');
            return false;
        }
        const baseTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], baseVault, TOKEN_PROGRAM_ID);
        if (!baseTransferInstruction) {
            Log.error('Failed to find base transfer instruction in lp init tx');
            return false;
        }
        const quoteTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], quoteVault, TOKEN_PROGRAM_ID);
        if (!quoteTransferInstruction) {
            Log.error('Failed to find quote transfer instruction in lp init tx');
            return false;
        }
        const lpDecimals = lpMintInitInstruction.parsed.info.decimals;
        const lpInitializationLogEntryInfo = this.extractLPInitializationLogEntryInfoFromLogEntry(this.findLogEntry('init_pc_amount', txData.meta?.logMessages ?? []) ?? '');
        const basePreBalance = (txData.meta?.preTokenBalances ?? []).find(balance => balance.mint === baseMint.toBase58());
        if (!basePreBalance) {
            Log.error('Failed to find base tokens preTokenBalance entry to parse the base tokens decimals');
            return false;
        }
        const baseDecimals = basePreBalance.uiTokenAmount.decimals;

        return {
            id: initInstruction.accounts[4],
            baseMint,
            quoteMint,
            lpMint,
            baseDecimals: baseAndQuoteSwapped ? SOL_DECIMALS : baseDecimals,
            quoteDecimals: baseAndQuoteSwapped ? baseDecimals : SOL_DECIMALS,
            lpDecimals,
            version: 4,
            programId: new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
            authority: initInstruction.accounts[5],
            openOrders: initInstruction.accounts[6],
            targetOrders: initInstruction.accounts[13],
            baseVault,
            quoteVault,
            withdrawQueue: new PublicKey("11111111111111111111111111111111"),
            lpVault: new PublicKey(lpMintInstruction.parsed.info.account),
            marketVersion: 3,
            marketProgramId: initInstruction.accounts[15],
            marketId: initInstruction.accounts[16],
            baseReserve: parseInt(baseTransferInstruction.parsed.info.amount),
            quoteReserve: parseInt(quoteTransferInstruction.parsed.info.amount),
            lpReserve: parseInt(lpMintInstruction.parsed.info.amount),
            openTime: lpInitializationLogEntryInfo.open_time,
        };
    }


    /**
    * Helper functions to parse Liquidity pool info.
    */
    private findTransferInstructionInInnerInstructionsByDestination(innerInstructions: Array<ParsedInnerInstruction>, destinationAccount: PublicKey, programId?: PublicKey): ParsedInstruction | null {
        for (let i = 0; i < innerInstructions.length; i++) {
            for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
                const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
                if (!instruction.parsed) { continue; };
                if (instruction.parsed.type === 'transfer' && instruction.parsed.info.destination === destinationAccount.toBase58() && (!programId || instruction.programId.equals(programId))) {
                    return instruction;
                }
            }
        }
        return null;
    }
    private findInitializeMintInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey): ParsedInstruction | null {
        for (let i = 0; i < innerInstructions.length; i++) {
            for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
                const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
                if (!instruction.parsed) { continue; };
                if (instruction.parsed.type === 'initializeMint' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                    return instruction;
                }
            }
        }
        return null;
    }
    private findMintToInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey): ParsedInstruction | null {
        for (let i = 0; i < innerInstructions.length; i++) {
            for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
                const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
                if (!instruction.parsed) { continue; };
                if (instruction.parsed.type === 'mintTo' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                    return instruction;
                }
            }
        }
        return null;
    }
    private findInstructionByProgramId(instructions: Array<ParsedInstruction | PartiallyDecodedInstruction>, programId: PublicKey): ParsedInstruction | PartiallyDecodedInstruction | null {
        for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].programId.equals(programId)) {
                return instructions[i];
            }
        }
        return null;
    }
    private extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string): { nonce: number, open_time: number, init_pc_amount: number, init_coin_amount: number; } {
        const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');

        return JSON.parse(this.fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
    }
    private fixRelaxedJsonInLpLogEntry(relaxedJson: string): string {
        return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
    }
    private findLogEntry(needle: string, logEntries: Array<string>): string | null {
        for (let i = 0; i < logEntries.length; ++i) {
            if (logEntries[i].includes(needle)) {
                return logEntries[i];
            }
        }
        return null;
    }
}

/**
 * Exports the singleton instance of the PoolInfoGatherer.
 */
export default PoolInfoGatherer.getInstance();



