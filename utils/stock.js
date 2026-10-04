const Product = require("../model/product.model");

// Merges order lines into one entry per product + size so a cart holding the
// same item twice is checked against stock once.
const groupLines = (items) => {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.productId}::${item.size || ""}`;
    const entry = groups.get(key) || { productId: item.productId, size: item.size || "", quantity: 0 };
    entry.quantity += item.quantity;
    groups.set(key, entry);
  }
  return [...groups.values()];
};

// Products that track units per size reserve from that size; others from the total
const takeOne = async ({ productId, size, quantity }) => {
  const sized = await Product.updateOne(
    { _id: productId, stock: { $gte: quantity }, sizeStock: { $elemMatch: { size, stock: { $gte: quantity } } } },
    { $inc: { stock: -quantity, "sizeStock.$[line].stock": -quantity } },
    { arrayFilters: [{ "line.size": size }] }
  );
  if (sized.modifiedCount) return true;

  const plain = await Product.updateOne(
    { _id: productId, stock: { $gte: quantity }, "sizeStock.0": { $exists: false } },
    { $inc: { stock: -quantity } }
  );
  return plain.modifiedCount > 0;
};

const putBackOne = async ({ productId, size, quantity }) => {
  const sized = await Product.updateOne(
    { _id: productId, "sizeStock.size": size },
    { $inc: { stock: quantity, "sizeStock.$[line].stock": quantity } },
    { arrayFilters: [{ "line.size": size }] }
  );
  if (sized.matchedCount) return;
  await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
};

// Reserves every line or none. Returns the line that ran out, or null on success.
const reserveStock = async (items) => {
  const taken = [];
  for (const line of groupLines(items)) {
    if (!(await takeOne(line))) {
      await Promise.all(taken.map(putBackOne));
      return line;
    }
    taken.push(line);
  }
  return null;
};

const releaseStock = async (items) => {
  await Promise.all(groupLines(items).map(putBackOne));
};

module.exports = { groupLines, reserveStock, releaseStock };
