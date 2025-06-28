export const creditFactors = [
    { 
      name: "Payment History", 
      value: 35,
      current: 95,
      tip: "Always pay bills on time to maintain a high score",
      icon: "fas fa-calendar-check"
    },
    { 
      name: "Credit Utilization", 
      value: 30,
      current: 78,
      tip: "Keep credit card balances below 30% of your limit",
      icon: "fas fa-credit-card"
    },
    { 
      name: "Credit History Length", 
      value: 15,
      current: 65,
      tip: "Avoid closing old accounts to preserve history",
      icon: "fas fa-clock"
    },
    { 
      name: "Credit Mix", 
      value: 10,
      current: 45,
      tip: "Consider adding different types of credit accounts",
      icon: "fas fa-cubes"
    },
    { 
      name: "New Credit / Inquiries", 
      value: 10,
      current: 82,
      tip: "Limit new credit applications to 1-2 per year",
      icon: "fas fa-search"
    },
  ];
  
  export const scoreRanges = [
    { range: "300-579", label: "Poor", color: "bg-red-500", textColor: "text-red-500" },
    { range: "580-669", label: "Fair", color: "bg-orange-400", textColor: "text-orange-500" },
    { range: "670-739", label: "Good", color: "bg-yellow-400", textColor: "text-yellow-500" },
    { range: "740-799", label: "Very Good", color: "bg-green-400", textColor: "text-green-500" },
    { range: "800-850", label: "Excellent", color: "bg-green-600", textColor: "text-green-600" },
  ];
  
  export const recommendations = [
    "Pay down credit card balances below 30% utilization",
    "Set up payment reminders to avoid late payments",
    "Review your credit report for errors annually",
    "Avoid opening new credit accounts unnecessarily",
    "Keep old accounts open to maintain history length"
  ];