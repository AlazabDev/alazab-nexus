# أوامر Git السريعة

## الأوامر الأساسية

### سحب التحديثات

```bash
# باستخدام npm
npm run git:pull

# باستخدام bash مباشرة
bash scripts/git-commands.sh pull
```

### سحب مع Rebase

```bash
npm run git:pull-rebase
bash scripts/git-commands.sh pull-rebase
```

### جلب التحديثات (بدون دمج)

```bash
npm run git:fetch
bash scripts/git-commands.sh fetch
```

### فحص الحالة

```bash
npm run git:status
bash scripts/git-commands.sh status
```

## المزامنة

### مزامنة مع main

```bash
npm run git:sync
bash scripts/git-commands.sh sync
```

### مزامنة كاملة (Stash + Pull + Deps)

```bash
npm run git:full-sync
bash scripts/git-commands.sh full-sync
```

### تحديث المكتبات + سحب

```bash
npm run git:deps
bash scripts/git-commands.sh deps
```

## عرض المعلومات

### آخر 10 تغييرات

```bash
npm run git:commits
bash scripts/git-commands.sh commits
```

### الفروقات المحلية

```bash
npm run git:diff
bash scripts/git-commands.sh diff
```

### قائمة التخزينات

```bash
npm run git:stashes
bash scripts/git-commands.sh stashes
```

## إدارة التغييرات

### تخزين التغييرات مؤقتاً

```bash
npm run git:stash
bash scripts/git-commands.sh stash
```

### استرجاع التغييرات المخزنة

```bash
npm run git:pop
bash scripts/git-commands.sh pop
```

## سيناريوهات شائعة

### تحديث المشروع كاملاً

```bash
npm run git:full-sync
```

### التحقق من التحديثات المتاحة

```bash
npm run git:status
```

### حفظ التغييرات مؤقتاً ثم السحب

```bash
npm run git:stash
npm run git:pull
npm run git:pop
```

### عرض آخر التغييرات

```bash
npm run git:commits
npm run git:diff
```

## المساعدة

```bash
bash scripts/git-commands.sh help
```

## ملاحظات مهمة

- لا تستخدم `pull-rebase` على الفروع الرئيسية (main/master)
- استخدم `stash` قبل السحب إذا كان لديك تغييرات محلية
- استخدم `full-sync` لمزامنة كاملة وآمنة
