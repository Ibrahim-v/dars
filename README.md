# دفتر الدروس

موقع شخصي: ترفع دروس PDF، تتصفحها صفحة صفحة، وتحل أسئلة بعد كل درس. تسجيل الدخول بجوجل عبر Firebase، وملفات PDF/الصور مرفوعة على Cloudinary.

## قبل التشغيل

### 1. قواعد أمان Firestore (خطوة ضرورية!)
اخترت وضع "Production mode" عند إنشاء قاعدة البيانات، وهذا يعني إن كل القراءة والكتابة ممنوعة افتراضياً. روح Firebase Console → Firestore Database → تبويب Rules، واستبدل المحتوى بهذا:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{lessonId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

هذا يخلي كل مستخدم يشوف ويعدّل بس دروسه هو.

### 2. تصريح الدومين لتسجيل الدخول
بعد لا ترفع الموقع على استضافة (Firebase Hosting أو غيرها)، روح Authentication → Settings → Authorized domains، وتأكد إن دومين الاستضافة مضاف. لو استخدمت Firebase Hosting فهو يضيف نفسه تلقائي.

### 3. تأكد من إعدادات Cloudinary
- الـ Upload Preset (`cnbellht`) لازم يكون Signing Mode = Unsigned.
- من Settings → Security تأكد إن خيار السماح بملفات PDF/ZIP مفعّل، وإلا رفع الملف ينجح لكن فتحه يرجع خطأ 401.

## النشر (الأسهل: Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # اختر مجلد المشروع كـ public directory، ولا تسوي single-page rewrite (مو ضروري هنا)
firebase deploy
```

بعد الأمر الأخير بيعطيك رابط مباشر (`https://dars-7507b.web.app` مثلاً) يشتغل عليه تسجيل الدخول بجوجل فعلياً.

## ملاحظات

- حذف درس من المكتبة يحذف بياناته من Firestore بس، بدون حذف ملف الـ PDF من Cloudinary (الحذف يحتاج طلب موقّع بمفتاح سري ما ننشره بالمتصفح لأسباب أمنية). لو حاب تنضيف الملفات القديمة بين فترة وفترة، تقدر تسويها يدوياً من لوحة Cloudinary.
- حد التخزين المجاني بـ Cloudinary تقريباً 25 جيجا شهرياً — أكثر من كافي لمكتبة دروس شخصية.
