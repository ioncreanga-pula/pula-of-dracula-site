import { useMemo, useState, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { supabase } from './supabase';

import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const PULA_MINT = new PublicKey('B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump');
const USD_TO_RON = 4.65; 
const USD_TO_EUR = 0.92;
const USD_TO_BWP = 13.75;

function Leaderboard({ currentAddress, hambarValue, onSelectAddress }: { currentAddress?: string, hambarValue: string, onSelectAddress?: (addr: string) => void }) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading && entries.length === 0) return <div className="leaderboard-loading">Se încarcă recolta...</div>;

    return (
        <div className="leaderboard-section">
            <div className="leaderboard-title">🏆 În vârful P.U.L.A.</div>
            <div className="hambar-sub-title">🔳 1 Hambar: {hambarValue} RON</div>
            <div className="recolta-header">Recolta totală, 1 Hambar = 1.000.000.000 P.U.L.A.</div>
            <div className="leaderboard-list">
                {entries.map((entry, index) => (
                    <div 
                        key={entry.address} 
                        className={`leaderboard-item ${entry.address === currentAddress ? 'is-me' : ''} ${onSelectAddress ? 'selectable' : ''}`}
                        onClick={() => onSelectAddress && onSelectAddress(entry.address)}
                    >
                        <div className="rank-name">
                            <span className="rank">#{index + 1}</span>
                            <span className="username">{entry.username}</span>
                        </div>
                        <div className="leaderboard-val-wrapper">
                            <div className="leaderboard-balance">
                                {entry.balance.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="leaderboard-percent">({getPercent(entry.balance)})</div>
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
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<string>('0.00');
    const [price, setPrice] = useState<number>(0);
    const [dieselPrice] = useState<number>(10.38);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<'RON' | 'USD' | 'EUR' | 'BWP'>('RON');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(`Copiat: ${label}`);
        setTimeout(() => setCopyStatus(null), 3000);
    };

    const fetchBalances = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        setError(null);

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
                    setPrice(0.00000231);
                }
            } catch (priceErr) {
                setPrice(0.00000231);
            }
        } catch (e: any) {
            console.error("Error fetching balances", e);
            setError(e.message?.includes('429') ? "Rate Limit. Reîncearcă." : "Eroare rețea.");
        } finally {
            setLoading(false);
        }
    }, [publicKey, connection]);

    useEffect(() => {
        fetchBalances();
        const id = setInterval(fetchBalances, 30000);
        return () => clearInterval(id);
    }, [fetchBalances]);

    // Sync to Leaderboard (Automat & Oficial)
    useEffect(() => {
        const syncToLeaderboard = async () => {
            if (!publicKey || balance === undefined || !supabase) return;
            
            // Așteptăm 2 secunde să se propage datele de profil din Phantom
            await new Promise(resolve => setTimeout(resolve, 2000));

            let phantomUsername = null;
            try {
                // Sursa 1: Obiectul Phantom injectat global
                const provider = (window as any).phantom?.solana || (window as any).solana;
                
                // Sursa 2: Verificăm și prin sesiunea directă dacă există
                if (provider?.isPhantom) {
                    phantomUsername = provider.session?.username || provider.username;
                }

                // Dacă tot nu avem, mai încercăm o dată să „ciupim” provider-ul
                if (!phantomUsername && (window as any).phantom?.solana?.session) {
                    phantomUsername = (window as any).phantom.solana.session.username;
                }
            } catch (e) {
                console.log("Eroare profil", e);
            }

            // Dacă am găsit nume, punem @, altfel punem adresa scurtată
            const displayName = phantomUsername ? `@${phantomUsername}` : publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4);

            try {
                // Verificăm dacă avem deja un nume cu @ în DB ca să nu-l suprascriem cu adresa din greșeală
                const { data: existing } = await supabase.from('leaderboard').select('username').eq('address', publicKey.toBase58()).single();
                
                if (existing?.username?.startsWith('@') && !displayName.startsWith('@')) {
                    // Dacă avem deja nume de boier, actualizăm doar balanța
                    await supabase.from('leaderboard').update({
                        balance: Math.floor(balance),
                        last_updated: new Date().toISOString()
                    }).eq('address', publicKey.toBase58());
                } else {
                    // Altfel, facem upsert complet (nume + balanță)
                    await supabase.from('leaderboard').upsert({
                        address: publicKey.toBase58(),
                        username: displayName,
                        balance: Math.floor(balance),
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'address' });
                }
            } catch (e) {
                console.error("Supabase sync error", e);
            }
        };

        if (publicKey) {
            syncToLeaderboard();
        }
    }, [publicKey, balance]);

    const usdValueNum = (balance || 0) * (price || 0);
    const ronValueNum = usdValueNum * USD_TO_RON;
    const eurValueNum = usdValueNum * USD_TO_EUR;
    const bwpValueNum = usdValueNum * USD_TO_BWP;

    const usdValue2 = usdValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const eurValue2 = eurValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bwpValue2 = bwpValueNum.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const getMainValue = () => {
        let val = 0;
        let symbol = '';
        if (displayCurrency === 'RON') { val = ronValueNum; symbol = 'RON'; }
        if (displayCurrency === 'USD') { val = usdValueNum; symbol = 'USD'; }
        if (displayCurrency === 'EUR') { val = eurValueNum; symbol = 'EUR'; }
        if (displayCurrency === 'BWP') { val = bwpValueNum; symbol = 'BWP'; }
        
        return { 
            amount: val.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 10 }),
            symbol 
        };
    };

    const mainVal = getMainValue();
    const dieselValue = (ronValueNum / dieselPrice).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
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
    const [destAddr, setDestAddr] = useState('');
    const [sendAmt, setSendAmt] = useState('');
    const [sending, setSending] = useState(false);

    const handleTransfer = async () => {
        if (!publicKey || !destAddr || !sendAmt) return;
        setSending(true);
        try {
            const destPK = new PublicKey(destAddr);
            const amount = parseFloat(sendAmt) * 1e6; // 6 decimals

            const { Transaction } = await import('@solana/web3.js');
            const { 
                createTransferCheckedInstruction, 
                getAssociatedTokenAddressSync, 
                createAssociatedTokenAccountInstruction,
                getAccount
            } = await import('@solana/spl-token');

            const sourceATA = getAssociatedTokenAddressSync(PULA_MINT, publicKey);
            const destATA = getAssociatedTokenAddressSync(PULA_MINT, destPK);

            const tx = new Transaction();
            
            // ADĂUGĂM BLOCKHASH (ESENȚIAL!)
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            try {
                await getAccount(connection, destATA);
            } catch (e) {
                tx.add(createAssociatedTokenAccountInstruction(
                    publicKey,
                    destATA,
                    destPK,
                    PULA_MINT
                ));
            }

            tx.add(createTransferCheckedInstruction(
                sourceATA,
                PULA_MINT,
                destATA,
                publicKey,
                amount,
                6
            ));

            const signature = await (window as any).phantom?.solana?.signAndSendTransaction(tx);
            if (signature) {
                alert(`Succes! Recolta a plecat.`);
                setShowTransfer(false);
                setDestAddr('');
                setSendAmt('');
                fetchBalances();
            }
        } catch (e: any) {
            console.error("Transfer error", e);
            alert(`Eroare: ${e.message}`);
        } finally {
            setSending(false);
        }
    };

    const [showReceive, setShowReceive] = useState(false);

    const handleBuy = (e: any) => {
        e.preventDefault();
        if (!publicKey) return;
        const walletAddr = publicKey.toBase58();
        // Adăugăm parametri pentru a evita blocajele de WebView și a forța un flux mai compatibil
        const baseUrl = 'https://buy.onramper.com/';
        const params = new URLSearchParams({
            defaultCrypto: 'sol',
            walletAddress: walletAddr,
            defaultPaymentMethod: 'googlepay',
            isIframe: 'false',
            redirectAtCheckout: 'true',
            themeName: 'dark'
        });
        window.open(`${baseUrl}?${params.toString()}`, '_blank');
    };

    const initJupiter = () => {
        const jup = (window as any).Jupiter;
        try {
            jup.init({
                displayMode: "modal",
                strictTokenList: false,
                endpoint: "https://solana-rpc.publicnode.com",
                formProps: {
                    initialOutputMint: PULA_MINT.toBase58(),
                },
            });
            setTimeout(() => {
                if (jup.show) jup.show();
                else if (jup.resume) jup.resume();
                else alert("Jupiter init OK, dar show() nu există!");
            }, 100);
        } catch (err: any) {
            alert("Jupiter Init Error: " + err.message);
        }
    };

    const handleSwap = (e: any) => {
        e.preventDefault();
        const jupWindow = (window as any).Jupiter;
        
        if (!jupWindow) {
            const script = document.createElement('script');
            script.src = "https://terminal.jup.ag/main-v2.js";
            script.onload = () => {
                const newJup = (window as any).Jupiter;
                if (newJup && newJup.init) {
                    initJupiter();
                }
            };
            document.head.appendChild(script);
        } else {
            if (jupWindow.init) {
                initJupiter();
            }
        }
    };

    const openInPhantom = () => {
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://phantom.app/ul/browse/${url}`;
    };

    return (
        <main className="app-main">
            {copyStatus && (
                <div className="copy-toast">
                    {copyStatus}
                </div>
            )}
            {!publicKey ? (
                <div className="welcome-screen">
                    <img src="economist-1988.jpg" alt="The Economist 1988" className="welcome-img" />
                    
                    {/* Logica ultra-simplificată pentru mobil/desktop */}
                    {isMobile && !isInsidePhantom ? (
                        <div className="mobile-phantom-box" style={{ marginTop: '20px' }}>
                            <button type="button" className="connect-btn-phantom-mobile" onClick={openInPhantom}>
                                Deschide în Phantom
                            </button>
                        </div>
                    ) : (
                        <div className="mobile-phantom-box" style={{ marginTop: '20px' }}>
                            {isMobile && isInsidePhantom && (
                                <>
                                    <p style={{ fontSize: '0.9rem', color: '#39ff14', fontWeight: 'bold', marginBottom: '20px' }}>
                                        ✅ Ești în browserul Phantom.
                                    </p>
                                    <WalletMultiButton className="connect-btn-large">
                                        Conectează
                                    </WalletMultiButton>
                                </>
                            )}
                            {!isMobile && (
                                <WalletMultiButton className="connect-btn-large">
                                    Conectează
                                </WalletMultiButton>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="dashboard-card main-wallet">
                        <div className="breakdown-list" style={{ marginTop: '0' }}>
                            {isTotalZero ? (
                                <div className="unit"><span className="geom">∅</span> <strong>0</strong> Nimic</div>
                            ) : (
                                <>
                                    {breakdown.hambare > 0 && (
                                        <div className="unit">
                                            🧺 <strong>{breakdown.hambare}</strong> {breakdown.hambare === 1 ? 'Hambar' : 'Hambare'} <span className="edu-note">({(breakdown.hambare * 1000000000).toLocaleString('ro-RO')} PULA)</span>
                                        </div>
                                    )}
                                    {breakdown.carute > 0 && (
                                        <div className="unit">
                                            <span className="geom">⊕</span> <strong>{breakdown.carute}</strong> {breakdown.carute === 1 ? 'Căruță' : 'Căruțe'} <span className="edu-note">({(breakdown.carute * 1000000).toLocaleString('ro-RO')} PULA)</span>
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
                                    {breakdown.fleacuri > 0 && (
                                        <div className="unit">
                                            <span className="geom">○</span> <strong>{breakdown.fleacuri}</strong> {breakdown.fleacuri === 1 ? 'Fleac' : 'Fleacuri'} <span className="edu-note">({(breakdown.fleacuri * 0.001).toLocaleString('ro-RO', { minimumFractionDigits: 3 })} PULA)</span>
                                        </div>
                                    )}
                                    {breakdown.nimicuri > 0 && (
                                        <div className="unit">
                                            <span className="geom">∅</span> <strong>{breakdown.nimicuri}</strong> Nimic <span className="edu-note">({(breakdown.nimicuri * 0.000001).toLocaleString('ro-RO', { minimumFractionDigits: 6 })} PULA)</span>
                                        </div>
                                    )}
                                    <div className="total-pula-row-interactive">
                                        <div className="total-pula-main">
                                            Total: <strong>{balance.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}</strong> P.U.L.A.
                                            <button type="button" className="refresh-btn-inline" onClick={fetchBalances} disabled={loading}>
                                                {loading ? '...' : '↻'}
                                            </button>
                                        </div>
                                        <div className="total-currency-secondary">
                                            <strong>{mainVal.amount}</strong> {mainVal.symbol}
                                        </div>
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
                            <div className="sol-info">
                                +{parseFloat(solBalance).toLocaleString('ro-RO', { minimumFractionDigits: 4 })} SOL (gaz)
                            </div>
                            <div className="diesel-info">
                                <span className="diesel-amount">{dieselValue}</span>
                                <span className="diesel-symbol"> L Motorină</span>
                            </div>
                        </div>
                        {error && <div className="error-tag">{error}</div>}
                    </div>

                    <div className="big-actions-vertical-compact">
                        <div className="action-row">
                            <button type="button" className="small-btn buy" onClick={handleBuy}>
                                <span className="btn-icon">💳</span>
                                <span className="btn-text">Cumpără</span>
                            </button>
                            <button type="button" className="small-btn swap" onClick={handleSwap}>
                                <span className="btn-icon">⚡</span>
                                <span className="btn-text">Transformă</span>
                            </button>
                        </div>
                        
                        <div className="action-row">
                            <button type="button" className={`small-btn receive ${showReceive ? 'active' : ''}`} onClick={() => { setShowReceive(!showReceive); setShowTransfer(false); }}>
                                <span className="btn-icon">⬇️</span>
                                <span className="btn-text">Ia</span>
                            </button>
                            <button type="button" className={`small-btn send ${showTransfer ? 'active' : ''}`} onClick={() => { setShowTransfer(!showTransfer); setShowReceive(false); }}>
                                <span className="btn-icon">⬆️</span>
                                <span className="btn-text">Dă</span>
                            </button>
                        </div>
                    </div>

                    {showReceive && (
                        <div className="receive-box">
                            <div className="receive-title">📥 Primește P.U.L.A.</div>
                            <div className="qr-wrapper" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${publicKey.toBase58()}`} 
                                    alt="QR Code" 
                                    className="qr-img" 
                                />
                                <div className="qr-hint">Click pe cod pentru copy</div>
                            </div>
                            <div className="receive-info">
                                <div className="receive-username">
                                    {(window as any).phantom?.solana?.session?.username ? `@${(window as any).phantom.solana.session.username}` : 'Boier Fără Nume'}
                                </div>
                                <code className="receive-address" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>
                                    {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
                                </code>
                            </div>
                        </div>
                    )}

                    {showTransfer && (
                        <div className="transfer-box">
                            <div className="transfer-title">📤 Trimite P.U.L.A.</div>
                            <div className="transfer-input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="Adresa portofel (Solana)" 
                                    className="transfer-input"
                                    value={destAddr}
                                    onChange={(e) => setDestAddr(e.target.value)}
                                />
                                <div className="input-hint">Poți da click pe cineva din clasament</div>
                            </div>
                            <div className="transfer-amt-row">
                                <input 
                                    type="number" 
                                    placeholder="Câte PULA?" 
                                    className="transfer-input"
                                    value={sendAmt}
                                    onChange={(e) => setSendAmt(e.target.value)}
                                />
                                <button type="button" className="transfer-btn" onClick={handleTransfer} disabled={sending}>
                                    {sending ? '...' : 'Dă'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="contract-address-box" onClick={() => handleCopy(PULA_MINT.toBase58(), "Adresa Contract")}>
                        <span className="contract-label">Mint Address:</span>
                        <code className="contract-code">{PULA_MINT.toBase58().slice(0, 8)}...{PULA_MINT.toBase58().slice(-8)}</code>
                        <span className="copy-hint"> (Click pentru import Phantom)</span>
                    </div>

                    <Leaderboard 
                        currentAddress={publicKey?.toBase58()} 
                        hambarValue={(price * 1000000000 * USD_TO_RON).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} 
                        onSelectAddress={(addr) => {
                            if (addr !== publicKey?.toBase58()) {
                                setDestAddr(addr);
                                setShowTransfer(true);
                                setShowReceive(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                    />

                    <div className="wallet-footer">
                        {/* Butonul a fost mutat în header */}
                    </div>
                </>
            )}
        </main>
    );
}

function AppHeader() {
    const { publicKey } = useWallet();
    return (
        <header className="app-header">
            <div className="logo-section">
                <a href="../ro/index.html" className="logo-link-app">
                    <img src="logo.png" alt="P.U.L.A." className="logo-img-header" />
                </a>
                <h1 className="logo-text">C.U.R. Wallet</h1>
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

    // Detecție mediu de rulare
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isInsidePhantom, setIsInsidePhantom] = useState<boolean>(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const mobile = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(ua);
        setIsMobile(mobile);
        
        const checkPhantom = () => {
            const isP = (window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom || false;
            setIsInsidePhantom(isP);
        };
        
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
