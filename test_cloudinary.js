const { cloudinary } = require("./src/config/cloudinary");
require("dotenv").config();

async function testCloudinary() {
  try {
    console.log("Testing Cloudinary with credentials:");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    
    const result = await cloudinary.uploader.upload("https://placehold.co/600x400.png", {
      folder: "khelbazar_test"
    });
    console.log("Cloudinary Upload Success!");
    console.log("URL:", result.url);
    process.exit(0);
  } catch (error) {
    console.error("Cloudinary Upload FAILED!");
    console.error(error);
    process.exit(1);
  }
}

testCloudinary();
