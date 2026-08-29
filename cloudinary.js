// cloudinary.js
// بديل مجاني لـ Firebase Storage: رفع غير موقّع (unsigned) مباشرة من المتصفح.
// نفس فكرة imgbb اللي كانت مستخدمة في ErrorBook، بس هنا يدعم PDF أيضاً.

const CLOUD_NAME = "xbjd0mgs";
const UPLOAD_PRESET = "cnbellht";

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

/**
 * يبني رابط مصغّر (thumbnail) من رابط Cloudinary أصلي عن طريق حقن
 * تحويلات (w/h/crop/quality/format) داخل الرابط، بدل ما نحمّل الصورة
 * الأصلية بحجمها الكامل بس عشان نعرضها بمقاس صغير (مثلاً الأفاتار).
 * هذا يخفف حجم التحميل بشكل كبير ويسرّع فتح الموقع.
 * @param {string} url رابط Cloudinary (secure_url)
 * @param {{w?:number,h?:number}} opts
 */
export function cldThumb(url, opts = {}) {
    if (!url || url.indexOf("res.cloudinary.com") === -1) return url;
    const w = opts.w || 96;
    const h = opts.h || 96;
    const transform = `f_auto,q_auto,w_${w},h_${h},c_fill,g_auto`;
    return url.replace("/upload/", `/upload/${transform}/`);
}
