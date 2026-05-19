// Production note:
// Replace these demo verifiers with real providers: TronGrid, BscScan, Etherscan, BlockCypher/Mempool.
// Never confirm a payment from TXID alone. Verify receiver address, amount, token contract, confirmations, and uniqueness.

export async function verifyCryptoPayment({ coin, network, txid, expectedAddress, expectedAmountUsd }) {
  if (!txid || txid.length < 12) {
    return { ok: false, status: 'REJECTED', confirmations: 0, reason: 'Invalid TXID' };
  }

  if (process.env.NODE_ENV !== 'production' && txid.toLowerCase().startsWith('demo')) {
    return { ok: true, status: 'CONFIRMED', confirmations: 12, reason: 'Demo confirmation only' };
  }

  return {
    ok: false,
    status: 'CONFIRMING',
    confirmations: 0,
    reason: `Verifier for ${coin}/${network} is not configured yet. Add provider API implementation.`
  };
}
