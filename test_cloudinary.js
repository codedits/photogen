const cloudinary = require('cloudinary').v2;
if (!process.env.CLOUDINARY_URL) {
	throw new Error('Missing CLOUDINARY_URL environment variable');
}
cloudinary.config({ secure: true });
console.log(cloudinary.config());
