const fs = require('fs');

const path = 'app/subscribe/page.js';
let content = fs.readFileSync(path, 'utf8');

// The file currently has:
//     });
//         
//         {/* 2-Column Split: Video Showcases (Left) | Subscription Wizard Form (Right) */}

const badSection = `    });
        
        {/* 2-Column Split: Video Showcases (Left) | Subscription Wizard Form (Right) */}`;

const goodSection = `    });
  };

  // Cost calculations
  const totalDeliveries = frequency === "morning" ? 30 : frequency === "evening" ? 12 : 8;
  const itemsSubtotal = (unitPrice * totalDeliveries) + addonsTotal;
  const taxes = Math.round(itemsSubtotal * 0.05);
  const finalTotal = itemsSubtotal + taxes;

  if (loading || !product) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#fcfaf7", color: "#2c1b0d", fontFamily: "var(--font-body)" }}>
        <h2>Loading Subscription Details...</h2>
      </div>
    );
  }

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="subscribe-container">
        
        {/* Header Summary section */}
        <section className="sub-header-summary">
          <span className="badge-promo">EXCLUSIVE LOYALTY CLUB</span>
          <h1>Customize Your Daily Brew Cycle</h1>
          <p>Configure your delivery windows, specify milk/sugar preferences, and let us handle your daily aromatic wake-up call.</p>
        </section>

        {/* 2-Column Split: Video Showcases (Left) | Subscription Wizard Form (Right) */}`;

content = content.replace(badSection, goodSection);

fs.writeFileSync(path, content);
console.log("Fixed page.js");
