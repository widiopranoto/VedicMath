// Main Application Logic
console.log("Vedic Math App Initialized");

// Konfigurasi Google Sheet
// INSTRUKSI: Ganti string di bawah ini dengan URL Web App dari Google Apps Script Anda.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweI_kIdm6fodR_-AmpDNaDwL58nriYb_1epQRRmhjKKN1nrUT5o3knqGpHQjabZgg6hw/exec'; 

// Global State
const appState = {
    user: null, // { username, level, score, unlockedTopics, history }
    currentView: 'loading', // loading, login, dashboard, topic, game
    currentTopicId: null,
    currentSession: {
        active: false,
        score: 0,
        timeLeft: 0,
        correctCount: 0,
        wrongCount: 0,
        timerInterval: null
    }
};

const LEVEL_UNLOCKS = {
    2: ['sq5'],
    3: ['sub_nikhilam'],
    4: ['base100'],
    5: ['mul_cross']
};

// ==========================================
// SOUND MANAGER
// ==========================================

const SoundManager = {
    sounds: {
        'begin': 'sounds/begin.wav',
        'bonus': 'sounds/bonus.wav',
        'clap': 'sounds/clap.wav',
        'coin': 'sounds/coin.wav',
        'end': 'sounds/end.wav',
        'fail': 'sounds/fail.wav',
        'gameover': 'sounds/gameover.wav',
        'jump': 'sounds/jump.wav',
        'levelup': 'sounds/levelup.wav',
        'score': 'sounds/score.wav',
        'timeup': 'sounds/timeup.wav',
        'whistle': 'sounds/whistle.wav',
        'yeah': 'sounds/yeah.wav'
    },
    
    cache: {},
    
    init: function() {
        // Preload sounds
        for (const [key, path] of Object.entries(this.sounds)) {
            const audio = new Audio(path);
            this.cache[key] = audio;
        }
    },
    
    play: function(key) {
        if (this.cache[key]) {
            // Clone allow overlapping sounds (e.g. rapid correct answers)
            const sound = this.cache[key].cloneNode();
            sound.volume = 0.5; 
            sound.play().catch(e => console.warn("Audio play blocked:", e));
        } else {
            console.warn("Sound not found:", key);
        }
    }
};

// Initialize sound system
SoundManager.init();

// ==========================================
// CURRICULUM & CONTENT DATA
// ==========================================

const curriculum = {
    "mul11": {
        id: "mul11",
        title: "Perkalian 11",
        category: "populer",
        description: "Trik kilat mengalikan angka apapun dengan 11.",
        difficulty: 1,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Konsep Dasar</h3>
                <p>Untuk mengalikan angka dua digit dengan 11, bayangkan Anda "membuka" angka tersebut dan menyisipkan jumlahnya di tengah.</p>
                
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                    <p class="font-bold text-xl mb-2">Contoh: 23 × 11</p>
                    <div class="flex justify-center items-center space-x-2 text-2xl font-mono">
                        <span class="text-blue-600">2</span>
                        <span class="text-gray-400">_</span>
                        <span class="text-red-600">3</span>
                    </div>
                    <p class="text-sm text-gray-500 my-2">Jumlahkan 2 + 3 = 5</p>
                    <div class="flex justify-center items-center space-x-1 text-3xl font-bold">
                        <span class="text-blue-600">2</span>
                        <span class="text-green-600">5</span>
                        <span class="text-red-600">3</span>
                    </div>
                    <p class="mt-2 text-brand font-bold">Hasil: 253</p>
                </div>

                <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm">
                    <strong>Peringatan (Simpanan):</strong><br>
                    Jika hasil penjumlahan lebih dari 9, angka puluhannya ditambahkan ke angka depan.<br>
                    Contoh: <strong>48 × 11</strong><br>
                    4 + 8 = 12 (Tulis 2, simpan 1 ke 4)<br>
                    (4+1) | 2 | 8 &rarr; <strong>528</strong>
                </div>
            </div>
        `,
        generator: (level) => {
            // Level 1: No carry (e.g., 23)
            // Level 2: With carry (e.g., 48)
            // Level 3: 3 digits
            let num;
            if (level <= 2) {
                // Easy/Medium
                do {
                    num = Math.floor(Math.random() * 89) + 10;
                } while (level === 1 && (Math.floor(num/10) + num%10 > 9)); // Ensure no carry for level 1
            } else {
                num = Math.floor(Math.random() * 900) + 100;
            }
            return {
                q: `${num} × 11`,
                a: num * 11
            };
        }
    },
    "sq5": {
        id: "sq5",
        title: "Kuadrat Akhiran 5",
        category: "populer",
        description: "Menghitung kuadrat angka yang berakhiran 5 dalam detik.",
        difficulty: 1,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Sutra: Ekadhikena Purvena</h3>
                <p>Artinya: "Dengan satu lebih dari angka sebelumnya".</p>
                
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                    <p class="font-bold text-xl mb-2">Contoh: 35²</p>
                    <div class="grid grid-cols-2 gap-4 text-left">
                        <div>
                            <p class="text-sm text-gray-500">Bagian Belakang:</p>
                            <p>Selalu <strong>25</strong></p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Bagian Depan:</p>
                            <p>Angka depan (3) dikali kakaknya (4).</p>
                            <p>3 × 4 = <strong>12</strong></p>
                        </div>
                    </div>
                    <div class="mt-4 text-3xl font-bold tracking-widest">
                        <span class="text-blue-600">12</span><span class="text-red-600">25</span>
                    </div>
                </div>
            </div>
        `,
        generator: (level) => {
            // Level 1: 15-95
            // Level 2: 105-195
            let base = (Math.floor(Math.random() * 9) + 1); // 1-9
            if (level > 2) base = (Math.floor(Math.random() * 19) + 1); // 1-19
            const num = base * 10 + 5;
            return {
                q: `${num}²`,
                a: num * num
            };
        }
    },
    "base100": {
        id: "base100",
        title: "Perkalian Basis 100",
        category: "populer",
        description: "Perkalian angka yang dekat dengan 100 (98, 97, 102, dll).",
        difficulty: 2,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Sutra: Nikhilam</h3>
                <p>Cari selisih (defisiensi) angka tersebut dengan 100.</p>
                
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                    <p class="font-bold text-xl mb-2">Contoh: 98 × 97</p>
                    <div class="flex justify-around mb-2 text-sm font-mono">
                        <div>98 (kurang 2) -> -02</div>
                        <div>97 (kurang 3) -> -03</div>
                    </div>
                    <div class="border-t border-gray-300 my-2"></div>
                    <div class="text-left text-sm ml-4">
                        <p>1. <strong>Belakang:</strong> Kalikan selisihnya.</p>
                        <p class="pl-4">(-02) × (-03) = <strong>06</strong> (harus 2 digit)</p>
                        <p>2. <strong>Depan:</strong> Kurangkan silang.</p>
                        <p class="pl-4">98 - 03 = <strong>95</strong> (atau 97 - 02)</p>
                    </div>
                    <div class="mt-4 text-3xl font-bold tracking-widest">
                        <span class="text-blue-600">95</span><span class="text-red-600">06</span>
                    </div>
                </div>
            </div>
        `,
        generator: (level) => {
            // Generate numbers close to 100 (e.g., 90-99)
            const n1 = 100 - (Math.floor(Math.random() * 9) + 1); // 91-99
            const n2 = 100 - (Math.floor(Math.random() * 9) + 1);
            return {
                q: `${n1} × ${n2}`,
                a: n1 * n2
            };
        }
    },
    "sub_nikhilam": {
        id: "sub_nikhilam",
        title: "Pengurangan Ajaib",
        category: "dasar",
        description: "Semua dari 9 dan Terakhir dari 10 (Nikhilam).",
        difficulty: 1,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Semua dari 9, Terakhir dari 10</h3>
                <p>Digunakan untuk pengurangan bilangan 10, 100, 1000, dst.</p>
                
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                    <p class="font-bold text-xl mb-2">1000 - 357</p>
                    <div class="flex justify-center space-x-4 font-mono text-lg">
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-500">9-3</span>
                            <span>6</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-500">9-5</span>
                            <span>4</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-500 text-red-500 font-bold">10-7</span>
                            <span class="text-red-600 font-bold">3</span>
                        </div>
                    </div>
                    <p class="mt-2 text-brand font-bold">Hasil: 643</p>
                </div>
            </div>
        `,
        generator: (level) => {
            // 1000 - xxx or 10000 - xxxx
            const power = level === 1 ? 1000 : 10000;
            const sub = Math.floor(Math.random() * (power - 10)) + 10;
            return {
                q: `${power} - ${sub}`,
                a: power - sub
            };
        }
    },
    "mul_cross": {
        id: "mul_cross",
        title: "Perkalian Silang",
        category: "dasar",
        description: "Metode Vertikal dan Silang untuk 2 digit.",
        difficulty: 3,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Urdhva Tiryagbhyam</h3>
                <p>Perkalian silang untuk sembarang 2 digit.</p>
                
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center text-sm">
                    <p class="font-bold text-xl mb-2">21 × 32</p>
                    <div class="grid grid-cols-3 gap-2">
                        <div class="flex flex-col items-center">
                            <span class="text-xs">Kiri</span>
                            <span class="font-mono">2 × 3</span>
                            <strong>6</strong>
                        </div>
                        <div class="flex flex-col items-center border-l border-r border-gray-300">
                            <span class="text-xs">Silang</span>
                            <span class="font-mono">(2×2)+(1×3)</span>
                            <strong>4+3=7</strong>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="text-xs">Kanan</span>
                            <span class="font-mono">1 × 2</span>
                            <strong>2</strong>
                        </div>
                    </div>
                    <p class="mt-2 text-brand font-bold text-xl">Hasil: 672</p>
                </div>
            </div>
        `,
        generator: (level) => {
            const n1 = Math.floor(Math.random() * 80) + 10;
            const n2 = Math.floor(Math.random() * 80) + 10;
            return {
                q: `${n1} × ${n2}`,
                a: n1 * n2
            };
        }
    },
    "add_compl": {
        id: "add_compl",
        title: "Penjumlahan Cepat",
        category: "dasar",
        description: "Melengkapi ke 10.",
        difficulty: 1,
        tutorial: `
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-brand">Melengkapi 10 (Spark Addition)</h3>
                <p>Saat menjumlahkan, cari pasangan yang membentuk 10.</p>
                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
                    <p>Contoh: <strong>8 + 5</strong></p>
                    <p class="text-sm">8 butuh 2 untuk jadi 10.</p>
                    <p class="text-sm">Ambil 2 dari 5 (sisa 3).</p>
                    <p class="font-bold mt-2">10 + 3 = 13</p>
                </div>
            </div>
        `,
        generator: (level) => {
            // Just simple addition but encourage speed
            const n1 = Math.floor(Math.random() * 50) + 20;
            const n2 = Math.floor(Math.random() * 50) + 20;
            return {
                q: `${n1} + ${n2}`,
                a: n1 + n2
            };
        }
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Check localStorage for existing user
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Attempt to load user
    const saved = localStorage.getItem('vedicUser');
    if (saved) {
        try {
            appState.user = JSON.parse(saved);
            showDashboard();
        } catch (e) {
            console.error("Save file corrupted");
            localStorage.removeItem('vedicUser');
            showLogin();
        }
    } else {
        showLogin();
    }
}

// Placeholder View Switchers (Logic will be filled in next steps)
function showLogin() {
    appState.currentView = 'login';
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full animate-fade-in">
            <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                <div class="mb-6">
                    <span class="text-6xl">🧠</span>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Selamat Datang!</h2>
                <p class="text-gray-500 mb-6">Masukkan nama kamu untuk mulai berlatih.</p>
                
                <input type="text" id="username-input" 
                    class="w-full px-4 py-3 rounded-lg border-2 border-brand-light focus:border-brand focus:outline-none text-center text-lg font-bold mb-4"
                    placeholder="Nama Panggilan" autocomplete="off">
                
                <button onclick="handleLogin()" 
                    class="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition transform active:scale-95 shadow-lg shadow-brand/30">
                    MULAI PETUALANGAN
                </button>
            </div>
        </div>
    `;
}

function handleLogin() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name) {
        // Initialize new user structure
        appState.user = {
            username: name,
            level: 1,
            xp: 0,
            totalScore: 0,
            unlockedTopics: ['add_compl', 'mul11'], // Start with easiest
            history: {}
        };
        saveUser();
        SoundManager.play('begin');
        syncToGoogleSheet(); // Sinkronisasi awal saat login
        showDashboard();
    } else {
        SoundManager.play('fail');
        input.classList.add('animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
    }
}

// ==========================================
// GAMIFICATION ENGINE
// ==========================================

function addXp(amount) {
    if (!appState.user) return;
    
    appState.user.xp += amount;
    appState.user.totalScore += amount;
    
    // Check Level Up: Level N requires N * 100 XP (cumulative) or simple formula
    // Let's use: XP needed for next level = Level * 100
    // Current Level 1 -> Need 100 XP to get to Level 2.
    
    const xpNeeded = appState.user.level * 100;
    
    if (appState.user.xp >= xpNeeded) {
        levelUp();
    }
    
    saveUser();
    updateHeader();
}

function levelUp() {
    appState.user.level++;
    appState.user.xp = 0; // Reset XP for next level, or keep cumulative? Let's reset for simplicity in UI bar
    
    SoundManager.play('levelup');
    if (LEVEL_UNLOCKS[appState.user.level]) {
        const newTopics = LEVEL_UNLOCKS[appState.user.level];
        appState.user.unlockedTopics.push(...newTopics);
        alert(`🎉 LEVEL UP! Kamu naik ke Level ${appState.user.level}!\nTopik baru terbuka: ${newTopics.map(id => curriculum[id].title).join(', ')}`);
    } else {
        alert(`🎉 LEVEL UP! Kamu naik ke Level ${appState.user.level}!`);
    }
    
    // Refresh Dashboard if currently viewing it
    if (appState.currentView === 'dashboard') {
        showDashboard();
    }
}

function saveUser() {
    if (appState.user) {
        localStorage.setItem('vedicUser', JSON.stringify(appState.user));
        updateHeader();
        // Kita sinkronkan juga setiap kali saveUser dipanggil (level up, game selesai)
        // Agar data di sheet selalu terupdate
        syncToGoogleSheet(); 
    }
}

function syncToGoogleSheet() {
    if (!appState.user || !GOOGLE_SCRIPT_URL) return;

    // Payload data yang akan dikirim
    const payload = {
        username: appState.user.username,
        level: appState.user.level,
        score: appState.user.totalScore
    };

    // Menggunakan fetch dengan mode no-cors untuk Google Apps Script
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        console.log("Data sent to Google Sheet");
    }).catch(err => {
        console.warn("Failed to send data to Google Sheet:", err);
    });
}

function updateHeader() {
    const userDisplay = document.getElementById('user-display');
    const nameSpan = document.getElementById('header-username');
    const lvlSpan = document.getElementById('header-level');
    
    if (appState.user) {
        userDisplay.classList.remove('hidden');
        userDisplay.classList.add('flex');
        nameSpan.textContent = appState.user.username;
        lvlSpan.textContent = 'Lvl ' + appState.user.level;
        
        // Add simple XP progress bar tooltip or visual if needed later
        lvlSpan.title = `XP: ${appState.user.xp} / ${appState.user.level * 100}`;
    } else {
        userDisplay.classList.add('hidden');
        userDisplay.classList.remove('flex');
    }
}

function showDashboard() {
    // Ensure any running game is stopped
    if (gameInterval) clearInterval(gameInterval);
    appState.currentSession.active = false;

    appState.currentView = 'dashboard';
    updateHeader();
    const main = document.getElementById('main-content');
    
    // Generate Category Sections
    const renderCategory = (catKey, catTitle) => {
        const topics = Object.values(curriculum).filter(t => t.category === catKey);
        let html = `<h3 class="font-bold text-gray-500 uppercase text-xs tracking-wider mb-3 mt-6">${catTitle}</h3>`;
        html += `<div class="grid grid-cols-2 gap-4">`;
        
        topics.forEach(topic => {
            const isUnlocked = appState.user.unlockedTopics.includes(topic.id);
            const score = (appState.user.history[topic.id] && appState.user.history[topic.id].highScore) || 0;
            
            html += `
                <div onclick="${isUnlocked ? `openTopic('${topic.id}')` : ''}" 
                    class="topic-card bg-white p-4 rounded-xl shadow-md border-b-4 ${isUnlocked ? 'border-brand cursor-pointer hover:shadow-lg' : 'border-gray-200 opacity-60 grayscale'} relative overflow-hidden group">
                    
                    ${!isUnlocked ? '<div class="absolute inset-0 bg-gray-100/50 flex items-center justify-center"><span class="text-2xl">🔒</span></div>' : ''}
                    
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-2xl">${getIconForTopic(topic.id)}</span>
                        ${score > 0 ? `<span class="text-xs font-bold text-accent-yellow bg-yellow-100 px-1.5 py-0.5 rounded">★ ${score}</span>` : ''}
                    </div>
                    <h4 class="font-bold text-gray-800 leading-tight">${topic.title}</h4>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-2">${topic.description}</p>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    };

    // Calculate Unlock Message
    const nextLevel = appState.user.level + 1;
    const xpTarget = appState.user.level * 100;
    const xpRemaining = xpTarget - appState.user.xp;
    
    let unlockMsg = '';
    if (LEVEL_UNLOCKS[nextLevel]) {
        const topicNames = LEVEL_UNLOCKS[nextLevel].map(id => curriculum[id].title).join(', ');
        unlockMsg = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm flex items-center shadow-sm animate-pulse">
                <span class="text-xl mr-3">🚀</span>
                <div>
                    <span class="font-bold text-blue-800">Misi Selanjutnya:</span>
                    <p class="text-blue-600">Dapatkan <strong>${xpRemaining} XP</strong> lagi untuk membuka <span class="font-bold underline">${topicNames}</span>!</p>
                </div>
            </div>
        `;
    } else {
        // Cek jika masih ada level selanjutnya meskipun tidak ada unlock spesifik
        // Atau jika sudah max level
        unlockMsg = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-sm flex items-center shadow-sm">
                <span class="text-xl mr-3">🏆</span>
                <div>
                    <span class="font-bold text-green-800">Luar Biasa!</span>
                    <p class="text-green-600">Terus berlatih untuk meningkatkan skormu!</p>
                </div>
            </div>
        `;
    }

    main.innerHTML = `
        <div class="animate-fade-in pb-8">
            <div class="bg-brand-light/10 p-4 rounded-xl mb-4 flex items-center justify-between">
                <div>
                    <p class="text-xs text-gray-500 font-bold uppercase">Total Skor</p>
                    <p class="text-3xl font-bold text-brand-dark">${appState.user.totalScore}</p>
                </div>
                <div class="text-right">
                     <p class="text-xs text-gray-500 font-bold uppercase">Level</p>
                     <p class="text-3xl font-bold text-brand-dark">${appState.user.level}</p>
                </div>
            </div>
            
            ${unlockMsg}

            ${renderCategory('populer', 'Trik Populer')}
            ${renderCategory('dasar', 'Dasar Veda')}
            
            <div class="mt-8 text-center">
                <button onclick="logout()" class="text-sm text-red-400 underline hover:text-red-600">Ganti Akun / Reset</button>
            </div>
        </div>
    `;
}

function getIconForTopic(id) {
    const icons = {
        'mul11': '⚡',
        'sq5': '🖐️',
        'base100': '💯',
        'sub_nikhilam': '➖',
        'mul_cross': '❌',
        'add_compl': '➕'
    };
    return icons[id] || '📝';
}

function logout() {
    if(confirm("Yakin ingin keluar? Progress akan tersimpan di browser ini.")) {
        localStorage.removeItem('vedicUser');
        appState.user = null;
        initApp();
    }
}

function openTopic(id) {
    SoundManager.play('jump');
    appState.currentTopicId = id;
    appState.currentView = 'topic';
    
    renderTopicView('learn');
}

function renderTopicView(tab) {
    const topic = curriculum[appState.currentTopicId];
    const main = document.getElementById('main-content');
    
    // Check if high score exists
    const stats = appState.user.history[topic.id] || { highScore: 0, played: 0 };

    main.innerHTML = `
        <div class="flex flex-col h-full relative animate-fade-in">
            <!-- Top Bar -->
            <div class="flex items-center justify-between mb-4">
                <button onclick="showDashboard()" class="text-gray-500 hover:text-brand font-bold text-sm flex items-center">
                    <span class="text-xl mr-1">←</span> Kembali
                </button>
                <div class="text-right">
                    <p class="text-xs text-gray-400 uppercase">High Score</p>
                    <p class="font-bold text-brand">${stats.highScore}</p>
                </div>
            </div>

            <h2 class="text-2xl font-bold text-gray-800 mb-4">${topic.title}</h2>

            <!-- Tabs -->
            <div class="flex border-b border-gray-200 mb-6">
                <button onclick="switchTab('learn')" id="tab-learn" 
                    class="flex-1 pb-2 border-b-4 font-bold transition-colors ${tab === 'learn' ? 'text-brand border-brand' : 'text-gray-400 border-transparent hover:text-gray-600'}">
                    📖 Pelajari
                </button>
                <button onclick="switchTab('practice')" id="tab-practice" 
                    class="flex-1 pb-2 border-b-4 font-bold transition-colors ${tab === 'practice' ? 'text-brand border-brand' : 'text-gray-400 border-transparent hover:text-gray-600'}">
                    🎮 Latihan
                </button>
            </div>

            <!-- Content Area -->
            <div id="tab-content" class="flex-grow overflow-y-auto tutorial-content pr-1">
                ${tab === 'learn' ? renderTutorial(topic) : renderGameStart(topic)}
            </div>
        </div>
    `;
}

function switchTab(tab) {
    SoundManager.play('jump');
    renderTopicView(tab);
}

function renderTutorial(topic) {
    return `
        <div class="prose prose-brand max-w-none">
            ${topic.tutorial}
            
            <div class="mt-8 mb-4 text-center">
                <button onclick="switchTab('practice')" class="bg-brand text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-brand-dark transform transition hover:-translate-y-1">
                    Saya Paham, Ayo Latihan! 👉
                </button>
            </div>
        </div>
    `;
}

function renderGameStart(topic) {
    return `
        <div class="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div class="p-6 bg-yellow-50 rounded-full mb-4">
                <span class="text-6xl">⏱️</span>
            </div>
            <div>
                <h3 class="text-xl font-bold text-gray-800">Mode Latihan</h3>
                <p class="text-gray-500 max-w-xs mx-auto mt-2">Jawab sebanyak mungkin soal dalam 60 detik. Dapatkan bonus poin untuk jawaban cepat!</p>
            </div>
            
            <button onclick="startSession()" 
                class="w-full max-w-xs bg-accent-green text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-500 transform transition active:scale-95 text-lg">
                MULAI GAME
            </button>
        </div>
    `;
}

// ==========================================
// GAME ENGINE
// ==========================================

let gameInterval;
let currentQuestionAnswer = null;

function startSession() {
    SoundManager.play('whistle');
    const topicId = appState.currentTopicId;
    if (!topicId) return;

    // Reset Session State
    appState.currentSession = {
        active: true,
        score: 0,
        timeLeft: 60, // 60 Seconds
        correctCount: 0,
        wrongCount: 0
    };

    // Render Game Interface
    const container = document.getElementById('tab-content');
    container.innerHTML = `
        <div class="flex flex-col h-full relative">
            <!-- HUD -->
            <div class="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-xl">
                <div class="flex items-center text-red-500 font-bold">
                    <span class="text-2xl mr-2">⏱️</span>
                    <span id="timer-display" class="text-xl font-mono">1:00</span>
                </div>
                <div class="flex items-center text-brand font-bold">
                    <span class="text-xl mr-2">⭐</span>
                    <span id="score-display" class="text-2xl">0</span>
                </div>
            </div>

            <!-- Question Area -->
            <div class="flex-grow flex flex-col items-center justify-center mb-8 relative">
                <div id="question-text" class="text-5xl font-bold text-gray-800 text-center animate-fade-in">
                    Siap?
                </div>
                <div id="feedback-msg" class="h-6 mt-2 text-sm font-bold text-center"></div>
            </div>

            <!-- Input Area -->
            <div class="w-full mb-4">
                <input type="tel" id="answer-input" 
                    class="w-full text-center text-3xl font-bold py-4 rounded-xl border-4 border-gray-200 focus:border-brand focus:outline-none transition-colors shadow-inner"
                    placeholder="?" autocomplete="off">
            </div>

            <button onclick="checkAnswer()" 
                class="w-full bg-brand text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform text-xl">
                JAWAB
            </button>
        </div>
    `;

    // Start Timer
    updateTimerDisplay();
    gameInterval = setInterval(gameTick, 1000);

    // Generate First Question
    nextQuestion();

    // Focus Input
    const input = document.getElementById('answer-input');
    input.focus();
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
}

function gameTick() {
    appState.currentSession.timeLeft--;
    updateTimerDisplay();

    if (appState.currentSession.timeLeft <= 0) {
        endSession();
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (display) {
        display.textContent = formatTime(appState.currentSession.timeLeft);
        if (appState.currentSession.timeLeft <= 10) {
            display.parentElement.classList.add('animate-pulse');
        }
    }
}

function nextQuestion() {
    const topic = curriculum[appState.currentTopicId];
    // Simple difficulty scaling: Level 1-2 users get easier questions, 3+ get slightly harder if generator supports it
    // We pass the user's level effectively, but clamped for generator logic if needed
    const difficultyParam = Math.min(Math.ceil(appState.user.level / 2), 3); 
    
    const qData = topic.generator(difficultyParam);
    currentQuestionAnswer = qData.a;

    const qDisplay = document.getElementById('question-text');
    const input = document.getElementById('answer-input');
    
    // Animate transition
    qDisplay.classList.remove('animate-fade-in');
    void qDisplay.offsetWidth; // trigger reflow
    qDisplay.textContent = qData.q;
    qDisplay.classList.add('animate-fade-in');

    input.value = '';
    input.focus();
}

function checkAnswer() {
    if (!appState.currentSession.active) return;

    const input = document.getElementById('answer-input');
    const userVal = parseFloat(input.value);
    
    if (isNaN(userVal)) return; // Ignore empty/invalid

    if (userVal === currentQuestionAnswer) {
        // CORRECT
        SoundManager.play('coin');
        appState.currentSession.score += 10;
        appState.currentSession.correctCount++;
        
        // Speed bonus? (If answered within first 20% of time... nah too complex for now)
        
        // Visual Feedback
        input.classList.add('border-green-400', 'bg-green-50');
        document.getElementById('score-display').textContent = appState.currentSession.score;
        
        setTimeout(() => {
            input.classList.remove('border-green-400', 'bg-green-50');
            nextQuestion();
        }, 200); // Quick transition
    } else {
        // WRONG
        SoundManager.play('fail');
        appState.currentSession.wrongCount++;
        input.classList.add('border-red-400', 'animate-shake', 'bg-red-50');
        
        setTimeout(() => {
            input.classList.remove('border-red-400', 'animate-shake', 'bg-red-50');
            input.value = '';
            input.focus();
        }, 500);
    }
}

function endSession() {
    clearInterval(gameInterval);
    SoundManager.play('timeup');
    appState.currentSession.active = false;
    
    const topicId = appState.currentTopicId;
    const sessionScore = appState.currentSession.score;
    const history = appState.user.history[topicId] || { highScore: 0, played: 0 };
    
    // Update History
    history.played++;
    const isNewHigh = sessionScore > history.highScore;
    if (isNewHigh) {
        history.highScore = sessionScore;
    }
    appState.user.history[topicId] = history;
    
    // Save & Add XP
    saveUser();
    
    // XP Gain: 10% of score + bonus for finishing
    const xpGained = Math.ceil(sessionScore / 5) + 5; // e.g., 100 score -> 20 + 5 = 25 XP
    addXp(xpGained);

    // Play Result Sound
    setTimeout(() => {
        if (isNewHigh && sessionScore > 0) {
            SoundManager.play('yeah');
            setTimeout(() => SoundManager.play('clap'), 500);
        } else {
            SoundManager.play('end');
        }
    }, 1000);

    // Show Results
    const container = document.getElementById('tab-content');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div class="text-6xl mb-2">
                ${isNewHigh ? '🏆' : '🏁'}
            </div>
            
            <div>
                <h3 class="text-2xl font-bold text-gray-800">Selesai!</h3>
                <p class="text-gray-500">Skor Kamu</p>
                <div class="text-5xl font-bold text-brand my-2">${sessionScore}</div>
                ${isNewHigh ? '<span class="bg-yellow-100 text-yellow-600 text-xs font-bold px-2 py-1 rounded-full">NEW HIGH SCORE!</span>' : ''}
            </div>

            <div class="grid grid-cols-2 gap-4 w-full max-w-xs text-sm">
                <div class="bg-green-50 p-3 rounded-lg">
                    <p class="text-green-600 font-bold">Benar</p>
                    <p class="text-xl">${appState.currentSession.correctCount}</p>
                </div>
                <div class="bg-red-50 p-3 rounded-lg">
                    <p class="text-red-600 font-bold">Salah</p>
                    <p class="text-xl">${appState.currentSession.wrongCount}</p>
                </div>
            </div>
            
            <div class="space-y-3 w-full max-w-xs mt-4">
                <button onclick="startSession()" class="w-full bg-brand text-white font-bold py-3 rounded-xl shadow hover:bg-brand-dark">
                    Main Lagi 🔄
                </button>
                <button onclick="showDashboard()" class="w-full bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                    Kembali ke Menu
                </button>
            </div>
        </div>
    `;
}

window.handleLogin = handleLogin;
window.openTopic = openTopic;
window.switchTab = switchTab;
window.startSession = startSession;
window.checkAnswer = checkAnswer;
window.logout = logout;