// cloudinary.js
// بديل مجاني لـ Firebase Storage: رفع غير موقّع (unsigned) مباشرة من المتصفح.
// نفس فكرة imgbb اللي كانت مستخدمة في ErrorBook، بس هنا يدعم PDF أيضاً.

const CLOUD_NAME = "cnbellht";
const UPLOAD_PRESET = "xbjd0mgs";

/**
 * يرفع أي ملف (PDF أو صورة) إلى Cloudinary ويرجع رابطه المباشر.
 * @param {File} file
 * @returns {Promise<{url:string, publicId:string, resourceType:string, bytes:number}>}
 */
export async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();

    if (!data.secure_url) {
        const msg = (data.error && data.error.message) ? data.error.message : "فشل رفع الملف";
        throw new Error(msg);
    }

    return {
        url: data.secure_url,
        publicId: data.public_id,
        resourceType: data.resource_type,
        bytes: data.bytes
    };
}
