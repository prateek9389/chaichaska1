const fs = require('fs');
const subPath = 'app/subscribe/page.js';

let subContent = fs.readFileSync(subPath, 'utf8');

const regex = /const \[paymentStep, setPaymentStep\] = useState\("invoice"\); \/\/ "invoice" \| "paying" \| "success"[\s\S]*?const taxes = Math\.round\(itemsSubtotal \* 0\.05\);/;

const replacement = `const [paymentStep, setPaymentStep] = useState("invoice"); // "invoice" | "paying" | "success"


  const handleStartSubscription = () => {
    setPaymentStep("invoice");
    setIsPaymentModalOpen(true);
  };

  // Cost calculations
  const totalDeliveries = frequency === "morning" ? 30 : frequency === "evening" ? 12 : 8;
  const itemsSubtotal = (unitPrice * totalDeliveries) + addonsTotal;

  const handleTriggerPayment = async () => {
    setPaymentStep("paying");
    
    // Build subscription object
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Starts tomorrow
    const endDate = new Date(startDate);
    const durationDays = totalDeliveries;
    endDate.setDate(endDate.getDate() + durationDays);

    const subData = {
      customer: "Guest User", // In a real app, from auth
      office: address || "Tower A, Floor 1",
      item: product.name,
      items: \`\${product.name} (\${sugarParam} sugar) \${addonsParam ? " + " + addonsParam : ""}\`,
      total: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      cost: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      price: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      timeSlot: frequency === "custom" ? customTime : frequency === "morning" ? "09:00" : "16:00",
      frequency: frequency.toUpperCase(),
      startDate: startDate.toLocaleDateString('en-GB'),
      endDateIso: endDate.toISOString(),
      endDate: endDate.toLocaleDateString('en-GB'),
      status: "Active"
    };

    try {
      await addSubscription(subData);
    } catch (err) {
      console.error("Error saving subscription:", err);
    }

    setPaymentStep("success");
  };

  const taxes = Math.round(itemsSubtotal * 0.05);`;

if (regex.test(subContent)) {
  subContent = subContent.replace(regex, replacement);
  fs.writeFileSync(subPath, subContent);
  console.log("Fixed subscribe page!");
} else {
  console.log("Could not find regex target.");
}
