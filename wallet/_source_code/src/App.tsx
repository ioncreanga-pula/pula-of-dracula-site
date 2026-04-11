import { useMemo, useState, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { supabase } from './supabase';

import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const PULA_MINT = new PublicKey('B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump');
const USD_TO_RON = 4.65; 
const USD_TO_EUR = 0.92;
const USD_TO_BWP = 13.75;

function Leaderboard({ currentAddress, price, displayCurrency, onSelectAddress }: { 
    currentAddress?: string, 
    price: number,
    displayCurrency: string,
    onSelectAddress?: (addr: string) => void 
}) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getHambarValue = () => {
        let val = price * 1000000000;
        let symbol = 'USD';
        if (displayCurrency === 'RON') { val *= USD_TO_RON; symbol = 'RON'; }
        if (displayCurrency === 'EUR') { val *= USD_TO_EUR; symbol = 'EUR'; }
        if (displayCurrency === 'BWP') { val *= USD_TO_BWP; symbol = 'BWP'; }
        return val.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' ' + symbol;
    };

    const fetchTop = useCallback(async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('balance', { ascending: false })
                .limit(10);
            
            if (!error && data) {
                setEntries(data);
            }
        } catch (err) {
            console.error("Leaderboard fetch error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTop();
        const interval = setInterval(fetchTop, 30000);
        return () => clearInterval(interval);
    }, [fetchTop]);

    const getPercent = (bal: number) => {
        const p = (bal / 1000000000) * 100;
        return p.toLocaleString('ro-RO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + '%';
    };

    const getCurrencyValue = (bal: number) => {
        let val = bal * price;
        let symbol = 'USD';
        if (displayCurrency === 'RON') { val *= USD_TO_RON; symbol = 'RON'; }
        if (displayCurrency === 'EUR') { val *= USD_TO_EUR; symbol = 'EUR'; }
        if (displayCurrency === 'BWP') { val *= USD_TO_BWP; symbol = 'BWP'; }
        return val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
    };

    const getHardcodedUsername = (index: number, originalUsername: string) => {
        const hardcoded = ["@gogupatraulea", "@Motanu", "@IonCreangaPULA", "@Midumu", "@EugenTha"];
        return hardcoded[index] || originalUsername;
    };

    if (loading && entries.length === 0) return <div className="leaderboard-loading">Se încarcă recolta...</div>;

    return (
        <div className="leaderboard-section">
            <div className="leaderboard-title">🏆 În vârful P.U.L.A.</div>
            <div className="hambar-sub-title">1 Hambar MarketCap: {getHambarValue()}</div>
            <div className="recolta-header">Recolta totală, 1 Hambar = 1.000.000.000 P.U.L.A.</div>
            <div className="leaderboard-list">
                {entries.map((entry, index) => (
                    <div 
                        key={entry.address} 
                        className={`leaderboard-item ${entry.address === currentAddress ? 'is-me' : ''} ${onSelectAddress ? 'selectable' : ''}`}
                        onClick={() => onSelectAddress && onSelectAddress(entry.address)}
                    >
                        <div className="rank-name-row">
                            <span className="rank">#{index + 1}</span>
                            <span className="username">{getHardcodedUsername(index, entry.username)}</span>
                            <span className="leaderboard-percent-under">{getPercent(entry.balance)}</span>
                        </div>
                        <div className="leaderboard-val-wrapper">
                            <div className="leaderboard-balance">
                                {entry.balance.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="leaderboard-currency-under">{getCurrencyValue(entry.balance)}</div>
                        </div>
                    </div>
                ))}
                {!loading && entries.length === 0 && <div className="leaderboard-loading">Niciun boier momentan.</div>}
            </div>
        </div>
    );
}

function Dashboard({ isMobile, isInsidePhantom }: { isMobile: boolean, isInsidePhantom: boolean }) {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<string>('0.00');
    const [price, setPrice] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [displayCurrency, setDisplayCurrency] = useState<'RON' | 'USD' | 'EUR' | 'BWP'>('RON');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(`Copiat: ${label}`);
        setTimeout(() => setCopyStatus(null), 3000);
    };

    const getUnitCurrencyValue = (amt: number) => {
        let val = amt * price;
        let symbol = 'USD';
        if (displayCurrency === 'RON') { val *= USD_TO_RON; symbol = 'RON'; }
        if (displayCurrency === 'EUR') { val *= USD_TO_EUR; symbol = 'EUR'; }
        if (displayCurrency === 'BWP') { val *= USD_TO_BWP; symbol = 'BWP'; }
        return val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
    };

    const fetchBalances = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);

        try {
            const sol = await connection.getBalance(publicKey);
            setSolBalance((sol / 1e9).toFixed(4));

            let pulaAmt = 0;
            try {
                const ata = spl.getAssociatedTokenAddressSync(PULA_MINT, publicKey);
                const balInfo = await connection.getTokenAccountBalance(ata);
                pulaAmt = balInfo.value.uiAmount || 0;
            } catch (ataError) {
                const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: PULA_MINT });
                if (accounts.value.length > 0) {
                    pulaAmt = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
                }
            }
            setBalance(pulaAmt);

            try {
                const pumpResp = await fetch(`https://frontend-api.pump.fun/coins/${PULA_MINT.toBase58()}`);
                const pumpData = await pumpResp.json();
                if (pumpData.usd_market_cap) {
                    setPrice(pumpData.usd_market_cap / 1000000000);
                } else {
                    setPrice(0.00000237);
                }
            } catch (priceErr) {
                setPrice(0.00000237);
            }
        } catch (e: any) {
            console.error("Error fetching balances", e);
        } finally {
            setLoading(false);
        }
    }, [publicKey, connection]);

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [fetchBalances]);

    const ronValueNum = balance * price * USD_TO_RON;
    const eurValueNum = balance * price * USD_TO_EUR;
    const bwpValueNum = balance * price * USD_TO_BWP;

    const usdValue2 = (balance * price).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const eurValue2 = eurValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bwpValue2 = bwpValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getMainValue = () => {
        let val = balance * price;
        let symbol = 'USD';
        if (displayCurrency === 'RON') { val = ronValueNum; symbol = 'RON'; }
        if (displayCurrency === 'EUR') { val = eurValueNum; symbol = 'EUR'; }
        if (displayCurrency === 'BWP') { val = bwpValueNum; symbol = 'BWP'; }
        return { amount: val.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 10 }), symbol };
    };

    const mainVal = getMainValue();
    const dieselPricePerL = 7.15; // Placeholder
    const dieselValue = (ronValueNum / dieselPricePerL).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getBreakdown = (num: number) => {
        let n = num;
        const hambare = Math.floor(n / 1000000000);
        n %= 1000000000;
        const carute = Math.floor(n / 1000000);
        n %= 1000000;
        const roabe = Math.floor(n / 1000);
        n %= 1000;
        const pula = Math.floor(n);
        n -= pula;
        const fleacuri = Math.floor(n * 1000);
        n = (n * 1000) - fleacuri;
        const nimicuri = Math.round(n * 1000);
        return { hambare, carute, roabe, pula, fleacuri, nimicuri };
    };

    const breakdown = getBreakdown(balance);
    const isTotalZero = balance <= 0;

    const [showTransfer, setShowTransfer] = useState(false);
    const [showReceive, setShowReceive] = useState(false);
    const [destAddr, setDestAddr] = useState('');
    const [sendAmt, setSendAmt] = useState('');
    const [sending, setSending] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleTransfer = async () => {
        if (!publicKey || !destAddr || !sendAmt) return;
        setSending(true);
        try {
            const destPubkey = new PublicKey(destAddr);
            const amt = Math.floor(parseFloat(sendAmt) * 1000000);
            
            const ataSource = spl.getAssociatedTokenAddressSync(PULA_MINT, publicKey);
            const ataDest = spl.getAssociatedTokenAddressSync(PULA_MINT, destPubkey);

            const transaction = new Transaction().add(
                spl.createTransferInstruction(
                    ataSource,
                    ataDest,
                    publicKey,
                    amt
                )
            );
            
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');
            
            alert("Tranzacție reușită!");
            setShowTransfer(false);
            fetchBalances();
        } catch (e: any) {
            console.error("Transfer error", e);
            alert("Eroare la transfer: " + (e.message || e));
        } finally {
            setSending(false);
        }
    };

    const handleBuy = () => {
        window.open(`https://onramper.com/?apiKey=pk_prod_01J0Y4Y5Y5Y5Y5Y5Y5Y5Y5Y5&defaultCrypto=SOL&isIframe=false&redirectAtCheckout=true`, '_blank');
    };

    const initJupiter = () => {
        if (!(window as any).Jupiter) {
            console.error("Jupiter not loaded yet");
            return;
        }
        (window as any).Jupiter.init({
            displayMode: "modal",
            mint: PULA_MINT.toBase58(),
            endpoint: "https://solana-rpc.publicnode.com",
        });
    };

    const handleSwap = (e: any) => {
        e.preventDefault();
        const jupWindow = (window as any).Jupiter;
        if (!jupWindow) {
            const script = document.createElement('script');
            script.src = "https://terminal.jup.ag/main-v2.js";
            script.onload = () => { 
                if ((window as any).Jupiter) {
                    initJupiter();
                } else {
                    console.error("Failed to load Jupiter script");
                }
            };
            document.head.appendChild(script);
        } else {
            initJupiter();
        }
    };

    const openInPhantom = () => {
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://phantom.app/ul/browse/${url}`;
    };

    return (
        <main className="app-main">
            {copyStatus && <div className="copy-toast">{copyStatus}</div>}
            {!publicKey ? (
                <div className="welcome-screen">
                    <img src="economist-1988.jpg" alt="The Economist 1988" className="welcome-img" />
                    {isMobile && !isInsidePhantom ? (
                        <button type="button" className="connect-btn-phantom-mobile" onClick={openInPhantom} style={{marginTop:'20px'}}>Deschide în Phantom</button>
                    ) : (
                        <div style={{marginTop:'20px'}}>
                            <WalletMultiButton className="connect-btn-large">Conectează</WalletMultiButton>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="dashboard-card main-wallet">
                        <button type="button" className="refresh-btn-top-right" onClick={fetchBalances} disabled={loading}>
                            {loading ? '...' : '↻'}
                        </button>
                        <div className="breakdown-list" style={{ marginTop: '0' }}>
                            {isTotalZero ? (
                                <div className="unit"><span className="geom">∅</span> <strong>0</strong> Nimic</div>
                            ) : (
                                <>
                                    {breakdown.hambare > 0 && (
                                        <div className="unit">
                                            🧺 <strong>{breakdown.hambare}</strong> {breakdown.hambare === 1 ? 'Hambar' : 'Hambare'} <span className="edu-note">({(breakdown.hambare * 1000000000).toLocaleString('ro-RO')} PULA)</span>
                                            <span className="unit-val-under">{getUnitCurrencyValue(breakdown.hambare * 1000000000)}</span>
                                        </div>
                                    )}
                                    {breakdown.carute > 0 && (
                                        <div className="unit">
                                            <span className="geom">⊕</span> <strong>{breakdown.carute}</strong> {breakdown.carute === 1 ? 'Căruță' : 'Căruțe'} <span className="edu-note">({(breakdown.carute * 1000000).toLocaleString('ro-RO')} PULA)</span>
                                            <span className="unit-val-under">{getUnitCurrencyValue(breakdown.carute * 1000000)}</span>
                                        </div>
                                    )}
                                    {breakdown.roabe > 0 && (
                                        <div className="unit">
                                            <span className="geom">♀</span> <strong>{breakdown.roabe}</strong> {breakdown.roabe === 1 ? 'Roabă' : 'Roabe'} <span className="edu-note">({(breakdown.roabe * 1000).toLocaleString('ro-RO')} PULA)</span>
                                        </div>
                                    )}
                                    {(breakdown.pula > 0 || breakdown.carute > 0 || breakdown.roabe > 0 || breakdown.hambare > 0) && (
                                        <div className="unit">
                                            <span className="geom">♂</span> <strong>{breakdown.pula}</strong> P.U.L.A. <span className="edu-note">({breakdown.pula.toLocaleString('ro-RO')} PULA)</span>
                                        </div>
                                    )}
                                    {breakdown.fleacuri > 0 && <div className="unit"><span className="geom">○</span> <strong>{breakdown.fleacuri}</strong> {breakdown.fleacuri === 1 ? 'Fleac' : 'Fleacuri'} <span className="edu-note">({(breakdown.fleacuri * 0.001).toLocaleString('ro-RO', { minimumFractionDigits: 3 })} PULA)</span></div>}
                                    {breakdown.nimicuri > 0 && <div className="unit"><span className="geom">∅</span> <strong>{breakdown.nimicuri}</strong> Nimic <span className="edu-note">({(breakdown.nimicuri * 0.000001).toLocaleString('ro-RO', { minimumFractionDigits: 6 })} PULA)</span></div>}
                                    <div className="total-pula-row-interactive">
                                        <div className="total-pula-main">Total: <strong>{balance.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}</strong> P.U.L.A.</div>
                                        <div className="total-currency-secondary"><strong>{mainVal.amount}</strong> {mainVal.symbol}</div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="multi-balance-row">
                            <div className={`val-box clickable ${displayCurrency === 'RON' ? 'active' : ''}`} onClick={() => setDisplayCurrency('RON')}>
                                <span className="val-amount">{ronValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="val-symbol"> RON</span>
                            </div>
                            <div className={`val-box clickable ${displayCurrency === 'USD' ? 'active' : ''}`} onClick={() => setDisplayCurrency('USD')}>
                                <span className="val-amount">{usdValue2}</span>
                                <span className="val-symbol"> USD</span>
                            </div>
                            <div className={`val-box clickable ${displayCurrency === 'EUR' ? 'active' : ''}`} onClick={() => setDisplayCurrency('EUR')}>
                                <span className="val-amount">{eurValue2}</span>
                                <span className="val-symbol"> EUR</span>
                            </div>
                            <div className={`val-box clickable ${displayCurrency === 'BWP' ? 'active' : ''}`} onClick={() => setDisplayCurrency('BWP')}>
                                <span className="val-amount">{bwpValue2}</span>
                                <span className="val-symbol"> BWP</span>
                            </div>
                        </div>
                        <div className="gas-diesel-row interactable" onClick={() => setDisplayCurrency('RON')}>
                            <div className={`sol-info ${parseFloat(solBalance) < 0.01 ? 'low-gas-warning' : ''}`}>
                                +{parseFloat(solBalance).toLocaleString('ro-RO', { minimumFractionDigits: 4 })} SOL (gaz)
                                {parseFloat(solBalance) < 0.01 && <span className="low-gas-tag"> ! GAZ CRITIC</span>}
                            </div>
                            <div className="diesel-info"><span className="diesel-amount">{dieselValue}</span> <span className="diesel-symbol"> L Motorină</span></div>
                        </div>
                    </div>

                    <div className="big-actions-vertical-compact">
                        <div className="action-row">
                            <button type="button" className="small-btn buy" onClick={handleBuy}><span className="btn-icon">💳</span> <span className="btn-text">Cumpără</span></button>
                            <button type="button" className="small-btn swap" onClick={handleSwap}><span className="btn-icon">⚡</span> <span className="btn-text">Transformă</span></button>
                        </div>
                        <div className="action-row">
                            <button type="button" className={`small-btn receive ${showReceive ? 'active' : ''}`} onClick={() => setShowReceive(true)}><span className="btn-icon">⬇️</span> <span className="btn-text">Ia</span></button>
                            <button type="button" className={`small-btn send ${showTransfer ? 'active' : ''}`} onClick={() => setShowTransfer(true)}><span className="btn-icon">⬆️</span> <span className="btn-text">Dă</span></button>
                        </div>
                    </div>

                    {showReceive && (
                        <div className="modal-overlay" onClick={() => setShowReceive(false)}>
                            <div className="receive-box modal-content" onClick={e => e.stopPropagation()}>
                                <button className="modal-close" onClick={() => setShowReceive(false)}>✕</button>
                                <div className="receive-title">📥 Primește P.U.L.A.</div>
                                <div className="qr-wrapper" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${publicKey.toBase58()}`} alt="QR Code" className="qr-img" />
                                    <div className="qr-hint">Click pe cod pentru copy</div>
                                </div>
                                <div className="receive-info">
                                    <div className="receive-username">{(window as any).phantom?.solana?.session?.username ? `@${(window as any).phantom.solana.session.username}` : 'Boier Fără Nume'}</div>
                                    <code className="receive-address" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>{publicKey.toBase58()}</code>
                                </div>
                            </div>
                        </div>
                    )}

                    {showTransfer && (
                        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
                            <div className="transfer-box modal-content" onClick={e => e.stopPropagation()}>
                                <button className="modal-close" onClick={() => setShowTransfer(false)}>✕</button>
                                <div className="transfer-title">📤 Trimite P.U.L.A.</div>
                                <div className="transfer-input-wrapper">
                                    <div className="input-with-action">
                                        <input type="text" placeholder="Adresa portofel" className="transfer-input" value={destAddr} onChange={(e) => setDestAddr(e.target.value)} />
                                        <button className="scanner-btn" onClick={() => setShowScanner(!showScanner)}>📷</button>
                                    </div>
                                    {showScanner && <div id="reader-wrapper"><div id="reader"></div><button className="close-scanner" onClick={() => setShowScanner(false)}>Închide</button></div>}
                                </div>
                                <div className="transfer-amt-row">
                                    <input type="number" placeholder="Câte PULA?" className="transfer-input" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} />
                                    <button type="button" className="transfer-btn" onClick={handleTransfer} disabled={sending}>{sending ? '...' : 'Dă'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <Leaderboard 
                        currentAddress={publicKey?.toBase58()} 
                        price={price}
                        displayCurrency={displayCurrency}
                        onSelectAddress={(addr) => {
                            if (addr !== publicKey?.toBase58()) {
                                setDestAddr(addr);
                                setShowTransfer(true);
                                window.scrollTo({ top: window.innerHeight / 2, behavior: 'smooth' });
                            }
                        }}
                    />
                </>
            )}
        </main>
    );
}

function AppHeader() {
    const { publicKey } = useWallet();
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Mint Address Copiat!");
    };
    return (
        <header className="app-header">
            <div className="logo-section">
                <a href="../ro/index.html" className="logo-link-app">
                    <img src="logo.png" alt="P.U.L.A." className="logo-img-header" />
                </a>
                <div className="title-mint-stack">
                    <h1 className="logo-text">C.U.R. Wallet</h1>
                    <div className="header-mint-box" onClick={() => handleCopy(PULA_MINT.toBase58())}>
                        <code>{PULA_MINT.toBase58().slice(0, 6)}...{PULA_MINT.toBase58().slice(-6)}</code>
                    </div>
                </div>
            </div>
            <div className="header-wallet-section">
                {publicKey && <WalletMultiButton className="header-wallet-btn" />}
            </div>
        </header>
    );
}

function App() {
    const endpoint = useMemo(() => "https://solana-rpc.publicnode.com", []);
    const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
    const [isMobile, setIsMobile] = useState(false);
    const [isInsidePhantom, setIsInsidePhantom] = useState(false);
    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        setIsMobile(/iphone|ipad|ipod|android|blackberry|windows phone/g.test(ua));
        const checkPhantom = () => setIsInsidePhantom((window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom || false);
        checkPhantom();
        setTimeout(checkPhantom, 500);
    }, []);
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div className="mobile-container">
                        <AppHeader />
                        <Dashboard isMobile={isMobile} isInsidePhantom={isInsidePhantom} />
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default App;