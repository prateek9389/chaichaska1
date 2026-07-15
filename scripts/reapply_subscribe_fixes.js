const fs = require('fs');
const path = 'app/subscribe/page.js';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Remove duplicate block
const duplicateBlock = `
  // Delivery Session Selection
  const [frequency, setFrequency] = useState("morning"); // "morning" | "evening" | "custom"
  const priceMultiplier = frequency === "morning" ? 0.75 : frequency === "evening" ? 0.85 : 0.9;
  const unitPrice = Math.round(product.priceNum * priceMultiplier);

  const [customTime, setCustomTime] = useState("09:00");

  // Invoice & Payment Modal Wizard State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState("invoice"); // "invoice" | "paying" | "success"
`;
if (content.split(duplicateBlock).length > 1) {
  // It appears twice, remove the second occurrence.
  const firstIndex = content.indexOf(duplicateBlock);
  const secondIndex = content.indexOf(duplicateBlock, firstIndex + 1);
  if (secondIndex !== -1) {
    content = content.substring(0, secondIndex) + content.substring(secondIndex + duplicateBlock.length);
  }
}

// Fix 2: unitPrice fix and add address state
content = content.replace(
  `const unitPrice = Math.round(product.priceNum * priceMultiplier);`,
  `const unitPrice = product ? Math.round(product.priceNum * priceMultiplier) : 0;`
);

content = content.replace(
  `const [customTime, setCustomTime] = useState("09:00");`,
  `const [customTime, setCustomTime] = useState("09:00");\n  const [address, setAddress] = useState("");`
);

// Fix 3: HandleStartSubscription missing address check
content = content.replace(
  `  const handleStartSubscription = () => {\n    setPaymentStep("invoice");`,
  `  const handleStartSubscription = () => {\n    if (!address.trim()) { alert("Please enter a valid delivery address."); return; }\n    setPaymentStep("invoice");`
);

// Fix 4: handleTriggerPayment updates for endDate & address
const origTriggerPayment = `  const handleTriggerPayment = () => {
    setPaymentStep("paying");
    const subData = {
      userId: user?.uid || "guest",
      customer: "Royal Tea Aficionado",
      item: product.name,
      addons: selectedAddons.map(a => a.name).join(", "),
      frequency: frequency,
      time: customTime || "09:00",
      total: \`₹\${finalTotal}\`,
      status: "Active",
      floor: "Floor 4"
    };`;

const newTriggerPayment = `  const handleTriggerPayment = () => {
    setPaymentStep("paying");
    
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() + 1);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + totalDeliveries);
    const startDateStr = startDateObj.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
    const endDateStr = endDateObj.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

    const subData = {
      userId: user?.uid || "guest",
      customer: "Royal Tea Aficionado",
      item: product.name,
      addons: selectedAddons.map(a => a.name).join(", "),
      frequency: frequency,
      time: customTime || "09:00",
      total: \`₹\${finalTotal}\`,
      totalCost: finalTotal,
      status: "Active",
      floor: address,
      startDate: startDateStr,
      endDate: endDateStr,
      endDateIso: endDateObj.toISOString()
    };`;
content = content.replace(origTriggerPayment, newTriggerPayment);

// Fix 5: Loading state before return
const origReturn = `  const finalTotal = itemsSubtotal + taxes;

  return (`;
const newReturn = `  const finalTotal = itemsSubtotal + taxes;

  if (loading || !product) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><h2>Loading Subscription Details...</h2></div>;
  }

  return (`;
content = content.replace(origReturn, newReturn);

// Fix 6: Address Input UI before order summary
const origSummary = `            {/* ORDER SUMMARY */}`;
const newSummary = `            {/* STEP 2: ENTER ADDRESS */}
            <div className="form-card" style={{ marginTop: "20px" }}>
              <span className="step-label">Step 2</span>
              <h3 className="form-section-title">Delivery Address</h3>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>Please provide your exact building floor and desk/room number.</p>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Tower B, Floor 4, Desk 42"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", fontFamily: "var(--font-body)" }}
              />
            </div>

            {/* ORDER SUMMARY */}`;
content = content.replace(origSummary, newSummary);

// Fix 7: startDate in modal
content = content.replace(
  `<strong>{startDate}</strong>`,
  `<strong>Tomorrow ({frequency === "custom" ? customTime : frequency === "morning" ? "07:30 AM" : "05:00 PM"})</strong>`
);

fs.writeFileSync(path, content);
console.log("All fixes applied successfully!");
