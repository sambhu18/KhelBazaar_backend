const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'khelbazar_uploads';
        const url = req.baseUrl || req.originalUrl || "";

        if (url.includes('products')) folder = 'khelbazar_products';
        else if (url.includes('club-posts')) folder = 'khelbazar_posts';
        else if (url.includes('users')) folder = 'khelbazar_users';
        else if (url.includes('reviews')) folder = 'khelbazar_reviews';
        else if (url.includes('rentals')) folder = 'khelbazar_rentals';

        return {
            folder: folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
        };
    },
});

module.exports = {
    cloudinary,
    storage,
};
