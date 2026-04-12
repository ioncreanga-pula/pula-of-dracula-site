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

const HAIDUCI_MAP: Record<string, string> = {
    '8o3Dcxcet2G5d5vppum8GQQ2BdQ3jU3Fy2yuzuEFFPbR': 'gogupatraulea',
    '2J87eoTT9fQmFN3RdP5hAfU5dQg8RMoa6zfKs4otPnwJ': 'Motanu',
    '6LQr1NhnJ3uN6Wbedg5riWYtd8acj8tqgxJUk1xnMpqh': 'IonCreanga',
    'b2VDPQgbt66Qv98tc6WyDHidUTJGaTF3Nr33yXpESWN': 'Midimu',
    '2CyPXp8rDb7kUxHYJAxR84Nu9aVNWqhSBjhBfvXGbcsL': 'EugenTarzan'
};

const getDisplayUsername = (address: string, dbUsername?: string) => {
    if (!address) return "";
    const a = address.trim();
    
    // 1. Prioritate absolută: Maparea fixă a haiducilor
    if (HAIDUCI_MAP[a]) return HAIDUCI_MAP[a];

    // 2. Numele din baza de date
    if (dbUsername && dbUsername.trim().length > 0 && dbUsername.trim() !== a) {
        return dbUsername.trim();
    }
    
    // 3. Altfel adresa scurtă
    return `${a.slice(0, 4)}...${a.slice(-4)}`;
};

const formatCurrencyDecimals = (valStr: string, symbol: string) => {
    if (!valStr) return <span className="bleu-text">0,00 {symbol}</span>;
    const parts = valStr.split(',');
    if (parts.length < 2) return <span className="bleu-text">{valStr} {symbol}</span>;
    const whole = parts[0];
    const decimals = parts[1];
    const firstTwo = decimals.slice(0, 2);
    const rest = decimals.slice(2);
    return (
        <>
            <span className="bleu-text">{whole},{firstTwo}</span>
            <span className="grey-text">{rest}</span>
            <span className="bleu-text"> {symbol}</span>
        </>
    );
};

function Leaderboard({ currentAddress, price, displayCurrency, onSelectAddress, refreshTrigger }: { 
    currentAddress?: string, 
    price: number,
    displayCurrency: string,
    onSelectAddress?: (addr: string) => void,
    refreshTrigger?: number
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
                // Mapare brutală și sigură a haiducilor
                const enriched = data.map((e: any) => {
                    const a = e.address.trim();
                    if (a === '8o3Dcxcet2G5d5vppum8GQQ2BdQ3jU3Fy2yuzuEFFPbR') e.username = 'gogupatraulea';
                    else if (a === '2J87eoTT9fQmFN3RdP5hAfU5dQg8RMoa6zfKs4otPnwJ') e.username = 'Motanu';
                    else if (a === '6LQr1NhnJ3uN6Wbedg5riWYtd8acj8tqgxJUk1xnMpqh') e.username = 'IonCreanga';
                    else if (a === 'b2VDPQgbt66Qv98tc6WyDHidUTJGaTF3Nr33yXpESWN') e.username = 'Midimu';
                    else if (a === '2CyPXp8rDb7kUxHYJAxR84Nu9aVNWqhSBjhBfvXGbcsL') e.username = 'EugenTarzan';
                    return e;
                });
                setEntries(enriched);
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
    }, [fetchTop, refreshTrigger]);

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

    if (loading && entries.length === 0) return <div className="leaderboard-loading">Se încarcă recolta...</div>;

    return (
        <div className="leaderboard-section">
            <div className="leaderboard-title">🏆 În vârful P.U.L.A.</div>
            <div className="hambar-sub-title">MarketCap 1 Hambar: {getHambarValue()}</div>
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
                            <div className="leaderboard-name-stack">
                                <span className="username">@{getDisplayUsername(entry.address, entry.username)}</span>
                                <span className="leaderboard-percent-under">{getPercent(entry.balance)}</span>
                            </div>
                        </div>
                        <div className="leaderboard-val-wrapper">
                            <div className="leaderboard-balance">
                                <span className="balance-num">{entry.balance.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}</span> <span className="balance-suffix">P.U.L.A.</span>
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

function Dashboard({ isMobile, isInsidePhantom, onUsernameChange, forceShowUsernameModal, onCloseUsernameModal, refreshTrigger, currentUsername }: { isMobile: boolean, isInsidePhantom: boolean, onUsernameChange: (u: string) => void, forceShowUsernameModal?: boolean, onCloseUsernameModal?: () => void, refreshTrigger?: number, currentUsername?: string }) {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<string>('0.00');
    const [price, setPrice] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [displayCurrency, setDisplayCurrency] = useState<'RON' | 'USD' | 'EUR' | 'BWP'>('RON');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);

    useEffect(() => {
        if (forceShowUsernameModal) {
            setShowUsernameModal(true);
            setNewUsername(currentUsername && currentUsername !== publicKey?.toBase58() ? currentUsername : '');
        }
    }, [forceShowUsernameModal, currentUsername, publicKey]);

    const handleSaveUsername = async () => {
        if (!publicKey || !newUsername || !supabase) return;
        const cleanName = newUsername.trim().replace('@', '');
        
        if (cleanName.length < 3) {
            alert("Numele este prea scurt (minim 3 caractere)!");
            return;
        }

        // 1. PROTECȚIE HAIDUCI: Verifică dacă numele este rezervat
        const reservedNames = ['gogupatraulea', 'Motanu', 'IonCreanga', 'Midimu', 'EugenTarzan'];
        if (reservedNames.some(n => n.toLowerCase() === cleanName.toLowerCase())) {
            // Permite salvarea doar dacă este chiar posesorul acelei adrese
            const a = publicKey.toBase58();
            const isOwner = (cleanName.toLowerCase() === 'gogupatraulea' && a === '8o3Dcxcet2G5d5vppum8GQQ2BdQ3jU3Fy2yuzuEFFPbR') ||
                            (cleanName.toLowerCase() === 'motanu' && a === '2J87eoTT9fQmFN3RdP5hAfU5dQg8RMoa6zfKs4otPnwJ') ||
                            (cleanName.toLowerCase() === 'ioncreanga' && a === '6LQr1NhnJ3uN6Wbedg5riWYtd8acj8tqgxJUk1xnMpqh') ||
                            (cleanName.toLowerCase() === 'midimu' && a === 'b2VDPQgbt66Qv98tc6WyDHidUTJGaTF3Nr33yXpESWN') ||
                            (cleanName.toLowerCase() === 'eugentarzan' && a === '2CyPXp8rDb7kUxHYJAxR84Nu9aVNWqhSBjhBfvXGbcsL');
            
            if (!isOwner) {
                alert("Acest nume este rezervat pentru un haiduc de vază!");
                return;
            }
        }

        setSavingUsername(true);
        try {
            // 2. Verifică dacă username-ul este deja luat de altcineva
            const { data: existing } = await supabase
                .from('leaderboard')
                .select('address')
                .eq('username', cleanName)
                .single();

            if (existing && existing.address !== publicKey.toBase58()) {
                alert("Acest nume este deja luat de un alt haiduc!");
                setSavingUsername(false);
                return;
            }

            const { error } = await supabase
                .from('leaderboard')
                .upsert({ 
                    address: publicKey.toBase58(), 
                    username: cleanName,
                    balance: balance 
                }, { onConflict: 'address' });
            
            if (!error) {
                // Sincronizare instantanee: trimitem noul nume către AppContent
                onUsernameChange(cleanName);
                
                // Opțional: curățăm local orice urmă de vechi nume
                setShowUsernameModal(false);
                if (onCloseUsernameModal) onCloseUsernameModal();
                alert("Profil Actualizat!");
            } else {
                alert("Eroare la salvarea profilului.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSavingUsername(false);
        }
    };

    const closeMyUsernameModal = () => {
        setShowUsernameModal(false);
        if (onCloseUsernameModal) onCloseUsernameModal();
    };

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

    // SINCRONIZARE AUTOMATĂ LEADERBOARD: Când balanța se schimbă, o trimitem în DB
    useEffect(() => {
        const syncBalance = async () => {
            if (!publicKey || !supabase || balance === 0) return;
            try {
                await supabase
                    .from('leaderboard')
                    .upsert({ 
                        address: publicKey.toBase58(), 
                        balance: balance 
                    }, { onConflict: 'address' });
            } catch (e) {
                console.error("Auto-sync error", e);
            }
        };
        syncBalance();
    }, [balance, publicKey]);

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
    const [showBuyOptions, setShowBuyOptions] = useState(false);
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

            const transaction = new Transaction();

            // Verifică dacă contul destinatarului există
            const info = await connection.getAccountInfo(ataDest);
            if (!info) {
                transaction.add(
                    spl.createAssociatedTokenAccountInstruction(
                        publicKey, // cine plătește chiria (tu)
                        ataDest,   // noul cont
                        destPubkey, // proprietarul
                        PULA_MINT   // token-ul
                    )
                );
            }

            transaction.add(
                spl.createTransferInstruction(
                    ataSource,
                    ataDest,
                    publicKey,
                    amt
                )
            );
            
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');
            
            alert("Tranzacție reușită! Haiducul a primit prada.");
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
        setShowBuyOptions(true);
    };

    const handleOpenProvider = (provider: string) => {
        const addr = publicKey?.toBase58() || '';
        let url = '';
        
        if (provider === 'revolut') {
            url = `https://ramp.revolut.com/?address=${addr}&network=solana`;
        } else if (provider === 'moonpay') {
            url = `https://buy.moonpay.com/?currencyCode=sol&baseCurrencyCode=ron&baseCurrencyAmount=100&walletAddress=${addr}`;
        } else if (provider === 'paybis') {
            // Paybis - Format SEO-friendly care forteaza Solana
            url = `https://paybis.com/buy-solana/?amount=50&currency=RON&address=${addr}`;
        } else if (provider === 'ramp') {
            url = `https://ramp.network/buy/?enabledCryptoAssets=SOL_SOL&defaultFiatAmount=50&fiatCurrency=RON&userAddress=${addr}`;
        }
        
        if (url) window.open(url, '_blank');
        setShowBuyOptions(false);
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
                                        <div className="total-currency-secondary"><strong>{formatCurrencyDecimals(mainVal.amount, mainVal.symbol)}</strong></div>
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
                            <button type="button" className={`small-btn receive ${showReceive ? 'active' : ''}`} onClick={() => setShowReceive(true)}><span className="btn-icon">⬇️</span> <span className="btn-text">Ia</span></button>
                            <button type="button" className={`small-btn send ${showTransfer ? 'active' : ''}`} onClick={() => setShowTransfer(true)}><span className="btn-icon">⬆️</span> <span className="btn-text">Dă</span></button>
                        </div>
                        <div className="action-row">
                            <button type="button" className={`small-btn buy ${showBuyOptions ? 'active' : ''}`} onClick={handleBuy}><span className="btn-icon">💳</span> <span className="btn-text">Cumpără</span></button>
                            <a 
                                href={`https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${PULA_MINT.toBase58()}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="small-btn swap"
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <span className="btn-icon">⚡</span> <span className="btn-text">Transformă</span>
                            </a>
                        </div>
                    </div>

                    {showBuyOptions && (
                        <div className="modal-overlay" onClick={() => setShowBuyOptions(false)}>
                            <div className="modal-content wider-modal" onClick={e => e.stopPropagation()}>
                                <button className="modal-close" onClick={() => setShowBuyOptions(false)}>✕</button>
                                <div className="transfer-title">💳 Cumpără SOL (50 RON)</div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button className="buy-option-btn" onClick={() => handleOpenProvider('revolut')}>
                                        <span className="buy-option-icon">💳</span>
                                        <div className="buy-option-text">
                                            <span className="buy-option-title">Revolut Ramp</span>
                                            <span className="buy-option-desc">Direct din contul tău Revolut.</span>
                                        </div>
                                    </button>

                                    <button className="buy-option-btn" onClick={() => handleOpenProvider('paybis')}>
                                        <span className="buy-option-icon">📦</span>
                                        <div className="buy-option-text">
                                            <span className="buy-option-title">Paybis</span>
                                            <span className="buy-option-desc">Interfață stabilă (sume mici).</span>
                                        </div>
                                    </button>

                                    <button className="buy-option-btn" onClick={() => handleOpenProvider('ramp')}>
                                        <span className="buy-option-icon">🚀</span>
                                        <div className="buy-option-text">
                                            <span className="buy-option-title">Ramp Network</span>
                                            <span className="buy-option-desc">Alternativă rapidă cu card.</span>
                                        </div>
                                    </button>

                                    <button className="buy-option-btn" onClick={() => handleOpenProvider('moonpay')}>
                                        <span className="buy-option-icon">🌙</span>
                                        <div className="buy-option-text">
                                            <span className="buy-option-title">MoonPay</span>
                                            <span className="buy-option-desc">Opțiune stabilă și rapidă.</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showUsernameModal && (
                        <div className="modal-overlay" onClick={closeMyUsernameModal}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <button className="modal-close" onClick={closeMyUsernameModal}>✕</button>
                                <div className="transfer-title">👤 Profil</div>
                                <div className="transfer-input-wrapper">
                                    <input 
                                        type="text" 
                                        placeholder={`@${getDisplayUsername(publicKey?.toBase58() || '', currentUsername)}`} 
                                        className="transfer-input" 
                                        value={newUsername} 
                                        onChange={(e) => setNewUsername(e.target.value)} 
                                    />
                                    <p className="username-note">Acest nume va apărea în Vârful P.U.L.A.</p>
                                    <div className="address-display-row" onClick={() => handleCopy(publicKey?.toBase58() || '', "Adresa ta")}>
                                        <span className="address-label">Adresa:</span>
                                        <code className="full-address-code">{publicKey?.toBase58()}</code>
                                    </div>
                                </div>
                                <button 
                                    className="transfer-btn w-100 taller-btn" 
                                    onClick={handleSaveUsername} 
                                    disabled={savingUsername}
                                >
                                    {savingUsername ? 'Se salvează...' : 'Salvează Haiducul'}
                                </button>
                            </div>
                        </div>
                    )}

                    {showReceive && (
                        <div className="modal-overlay" onClick={() => setShowReceive(false)}>
                            <div className="receive-box modal-content wider-modal compact-height" onClick={e => e.stopPropagation()}>
                                <button className="modal-close" onClick={() => setShowReceive(false)}>✕</button>
                                <div className="receive-title">📥 Primește P.U.L.A.</div>
                                <div className="qr-white-container" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>
                                    <div className="qr-container-row-minimal">
                                        <div className="qr-wrapper-minimal">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${publicKey.toBase58()}`} alt="QR Code" className="qr-img" />
                                        </div>
                                        <div className="vertical-username-text">
                                            @{getDisplayUsername(publicKey.toBase58(), currentUsername)}
                                        </div>
                                    </div>
                                    <div className="qr-hint-black">Apasă pe imagine pentru copiere</div>
                                </div>
                                <div className="receive-info-new">
                                    <div className="address-sol-label">Adresa ta Solana</div>
                                    <code className="receive-address-single-line" onClick={() => handleCopy(publicKey.toBase58(), "Adresa ta")}>{publicKey.toBase58()}</code>
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
                                    {destAddr && (
                                        <div className="dest-username-preview">
                                            Către C.U.R.-ul lui <strong>@{getDisplayUsername(destAddr)}</strong>
                                        </div>
                                    )}
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
                        refreshTrigger={refreshTrigger}
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

function AppHeader({ username, publicKey, onShowUsername }: { username?: string, publicKey?: any, onShowUsername: () => void }) {
    const { disconnect } = useWallet();
    const [showMenu, setShowMenu] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Adresă Copiată!");
    };

    const displayLabel = getDisplayUsername(publicKey?.toBase58() || '', username);

    if (!publicKey) {
        return (
            <header className="app-header">
                <div className="logo-section">
                    <a href="../ro/index.html" className="logo-link-app">
                        <img src="logo.png" alt="P.U.L.A." className="logo-img-header" />
                    </a>
                    <div className="title-mint-stack">
                        <h1 className="logo-text">C.U.R. Wallet</h1>
                    </div>
                </div>
                <div className="header-wallet-section">
                    {/* Butonul apare doar la conectare, conform cerinței */}
                </div>
            </header>
        );
    }

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
            <div className="header-wallet-section custom-dropdown">
                <button className="header-wallet-btn pretty-connected" onClick={() => setShowMenu(!showMenu)}>
                    {displayLabel.includes('...') ? displayLabel : `@${displayLabel}`}
                </button>
                {showMenu && (
                    <div className="wallet-dropdown-menu">
                        <div className="dropdown-item" onClick={() => { onShowUsername(); setShowMenu(false); }}>👤 Profil</div>
                        <div className="dropdown-item disconnect" onClick={() => { disconnect(); setShowMenu(false); }}>🛑 Deconectare</div>
                    </div>
                )}
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
                    <AppContent isMobile={isMobile} isInsidePhantom={isInsidePhantom} />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

function AppContent({ isMobile, isInsidePhantom }: { isMobile: boolean, isInsidePhantom: boolean }) {
    const { publicKey } = useWallet();
    const [username, setUsername] = useState<string | undefined>(undefined);
    const [showUsernameModalInApp, setShowUsernameModalInApp] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (!publicKey) {
            setUsername(undefined);
            return;
        }
        const fetchUsername = async () => {
            if (!publicKey || !supabase) return;
            const { data, error } = await supabase
                .from('leaderboard')
                .select('username')
                .eq('address', publicKey.toBase58())
                .single();
            if (!error && data) {
                // Filtrare suplimentară: Dacă numele din DB este rezervat, dar adresa nu este a proprietarului, îl ignorăm
                const dbName = data.username;
                const reservedNames = ['gogupatraulea', 'Motanu', 'IonCreanga', 'Midimu', 'EugenTarzan'];
                const a = publicKey.toBase58();
                
                const isReserved = reservedNames.some(n => n.toLowerCase() === dbName?.toLowerCase());
                if (isReserved) {
                    const isOwner = (dbName.toLowerCase() === 'gogupatraulea' && a === '8o3Dcxcet2G5d5vppum8GQQ2BdQ3jU3Fy2yuzuEFFPbR') ||
                                    (dbName.toLowerCase() === 'motanu' && a === '2J87eoTT9fQmFN3RdP5hAfU5dQg8RMoa6zfKs4otPnwJ') ||
                                    (dbName.toLowerCase() === 'ioncreanga' && a === '6LQr1NhnJ3uN6Wbedg5riWYtd8acj8tqgxJUk1xnMpqh') ||
                                    (dbName.toLowerCase() === 'midimu' && a === 'b2VDPQgbt66Qv98tc6WyDHidUTJGaTF3Nr33yXpESWN') ||
                                    (dbName.toLowerCase() === 'eugentarzan' && a === '2CyPXp8rDb7kUxHYJAxR84Nu9aVNWqhSBjhBfvXGbcsL');
                    
                    if (!isOwner) {
                        setUsername(undefined); // Resetăm dacă este un hoț
                        return;
                    }
                }
                setUsername(dbName);
            }
        };
        fetchUsername();
    }, [publicKey, refreshTrigger]);

    return (
        <div className="mobile-container">
            <AppHeader username={username} publicKey={publicKey} onShowUsername={() => setShowUsernameModalInApp(true)} />
            <Dashboard 
                isMobile={isMobile} 
                isInsidePhantom={isInsidePhantom} 
                currentUsername={username}
                onUsernameChange={(u) => { setUsername(u); setRefreshTrigger(prev => prev + 1); }}
                forceShowUsernameModal={showUsernameModalInApp}
                onCloseUsernameModal={() => setShowUsernameModalInApp(false)}
                refreshTrigger={refreshTrigger}
            />
        </div>
    );
}

export default App;