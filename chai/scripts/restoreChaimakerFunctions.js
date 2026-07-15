const fs = require('fs');
let lines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');

// Find where useEffect ends (around "return () => unsubOrders();")
const insertAfterIdx = lines.findIndex(l => l.includes('return () => unsubOrders()'));
if (insertAfterIdx === -1) {
  console.log('Could not find insertion point');
  process.exit(1);
}

// Find the }, []); that closes that useEffect
let closeIdx = insertAfterIdx;
for (let i = insertAfterIdx; i < lines.length; i++) {
  if (lines[i].includes('}, []);')) {
    closeIdx = i;
    break;
  }
}

console.log('Inserting functions after line:', closeIdx + 1);

const functionsToInsert = `
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allocateTime = (id, timeVal) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, allocatedTime: timeVal } : o))
    );
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === "brewmaster" && password === "chai") {
      setIsLoggedIn(true);
      localStorage.setItem("brewmaster_logged", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Hint: brewmaster / chai");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("brewmaster_logged");
  };

  const playAlarmTone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1020, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) {}
  };

  const startAlertRinging = () => {
    if (audioIntervalRef.current) return;
    playAlarmTone();
    audioIntervalRef.current = setInterval(playAlarmTone, 750);
  };

  const stopAlertRinging = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const triggerMockOrderAlert = () => {
    const mockOrderObj = {
      id: \`#1024\${Math.floor(1 + Math.random() * 9)}\`,
      item: "Kesar Saffron Royal Chai x2",
      customer: "Amit Sharma",
      office: "Office 305, Block C",
      sugar: "Mild Sugar",
      milk: "Organic Oat Milk",
      img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    };
    setIncomingOrder(mockOrderObj);
    setCountdown(60);
    startAlertRinging();
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopAlertRinging();
          setIncomingOrder(null);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── FIREBASE-BACKED ORDER ACTIONS ──────────────────────────────────
  // All status changes write to Firebase so Admin + Chaimaker both update in real-time

  const acceptOrderAlert = () => {
    stopAlertRinging();
    if (incomingOrder) {
      // Write "Pending" to Firebase → onOrdersSnapshot fires → both dashboards update
      updateOrder(incomingOrder.id, { status: "Pending" });
    }
    setIncomingOrder(null);
  };

  const rejectOrderAlert = () => {
    stopAlertRinging();
    if (incomingOrder) {
      updateOrder(incomingOrder.id, { status: "Cancelled" });
    }
    setIncomingOrder(null);
  };

  const acceptSpecificOrder = (id) => {
    // Persist to Firebase → triggers onOrdersSnapshot → updates Admin + Chaimaker
    updateOrder(id, { status: "Pending" });
  };

  const rejectSpecificOrder = (id) => {
    // Persist to Firebase → triggers onOrdersSnapshot → updates Admin + Chaimaker
    updateOrder(id, { status: "Cancelled" });
  };
`;

// Remove the old "}, []);" line at closeIdx and replace with full block
lines.splice(closeIdx, 1, ...functionsToInsert.split('\n'));
fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));
console.log('All functions restored + Firebase wired! Lines:', lines.length);
