const mongoose = require('mongoose');
require('dotenv').config();

async function refreshStock() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Product = mongoose.model('Product', new mongoose.Schema({
            stock: Number,
            status: String
        }));

        const result = await Product.updateMany(
            { status: 'approved' },
            { $set: { stock: 50 } }
        );

        console.log(`Successfully updated stock for ${result.modifiedCount} approved products.`);
        process.exit(0);
    } catch (err) {
        console.error("STOCK REFRESH ERROR:", err);
        process.exit(1);
    }
}

refreshStock();
