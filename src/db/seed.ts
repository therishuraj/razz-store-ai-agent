import db from "./database";

const knowledgeEntries = [
  {
    topic: "returns",
    content:
      "Items can be returned within 30 days of purchase, unused and in original packaging. Refunds are processed within 5-7 business days back to the original payment method. Sale items are non-refundable.",
  },
  {
    topic: "shipping",
    content:
      "We ship to USA and Canada only. Standard delivery takes 3-5 business days. Express delivery (1-2 days) is available for an extra $15. Free standard shipping on orders over $50.",
  },
  {
    topic: "support",
    content:
      "Customer support hours are Monday to Friday, 9am - 5pm EST. Email us at support@razzstore.com. We aim to respond within 24 hours on business days.",
  },
  {
    topic: "products",
    content:
      "We sell electronics, accessories, and gadgets. All products come with a 1-year manufacturer warranty. Extended warranty plans are available at checkout.",
  },
  {
    topic: "payment",
    content:
      "We accept Visa, Mastercard, PayPal, and Apple Pay. All transactions are secured with SSL encryption. We do not offer cash on delivery.",
  },
  {
    topic: "orders",
    content:
      "You can track your order using the tracking link sent to your email after dispatch. Orders can be cancelled within 1 hour of placing them by contacting support.",
  },
];

// Only seed if table is empty
const existing = db.prepare("SELECT COUNT(*) as count FROM knowledge_base").get() as { count: number };

if (existing.count === 0) {
  const insert = db.prepare("INSERT INTO knowledge_base (topic, content) VALUES (?, ?)");
  const insertMany = db.transaction(() => {
    for (const entry of knowledgeEntries) {
      insert.run(entry.topic, entry.content);
    }
  });
  insertMany();
  console.log(`Seeded ${knowledgeEntries.length} knowledge entries.`);
} else {
  console.log(`Knowledge base already seeded (${existing.count} entries). Skipping.`);
}
