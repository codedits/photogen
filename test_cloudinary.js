const cloudinary = require('cloudinary').v2;
process.env.CLOUDINARY_URL = 'cloudinary://644265388114947:JL-gxCQoAmPvT1enslWtGSbUNc8@dabe2km8m';
cloudinary.config({ secure: true });
console.log(cloudinary.config());
