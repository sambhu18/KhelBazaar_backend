const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URL);
    const Product = mongoose.model('Product', new mongoose.Schema({
        title: String,
        variants: Array,
        sizes: Array,
        stock: Number,
        status: String
    }));
    const products = await Product.find({ status: 'approved' });
    console.log(`Found ${products.length} approved products`);
    products.forEach(p => {
        console.log(`Title: ${p.title} | ID: ${p._id}`);
        console.log(`  Variants: ${JSON.stringify(p.variants)}`);
        console.log(`  Sizes: ${JSON.stringify(p.sizes)}`);
        console.log(`  Stock: ${p.stock}`);
    });
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
