#!/bin/bash

# Git Commands Utility - أوامر Git المفيدة
# Usage: bash scripts/git-commands.sh [command]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 1. Pull Updates - سحب التحديثات
pull_updates() {
    print_header "سحب التحديثات من المستودع البعيد"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    print_info "الفرع الحالي: $CURRENT_BRANCH"
    
    echo -e "\n${YELLOW}جاري السحب...${NC}\n"
    git fetch origin
    
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        print_error "أنت على الفرع الرئيسي! استخدم rebase بحذر"
        git rebase origin/$CURRENT_BRANCH
    else
        git pull origin $CURRENT_BRANCH
    fi
    
    print_success "تم سحب التحديثات بنجاح"
    echo ""
}

# 2. Pull with Rebase - السحب مع إعادة الأساس
pull_rebase() {
    print_header "سحب مع إعادة الأساس (rebase)"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    print_info "الفرع الحالي: $CURRENT_BRANCH"
    
    echo -e "\n${YELLOW}جاري السحب مع rebase...${NC}\n"
    git fetch origin
    git rebase origin/$CURRENT_BRANCH
    
    print_success "تم السحب مع rebase بنجاح"
    echo ""
}

# 3. Sync with Main - المزامنة مع الفرع الرئيسي
sync_with_main() {
    print_header "مزامنة الفرع الحالي مع main"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        print_error "أنت بالفعل على الفرع الرئيسي"
        return 1
    fi
    
    print_info "الفرع الحالي: $CURRENT_BRANCH"
    
    echo -e "\n${YELLOW}جاري المزامنة...${NC}\n"
    git fetch origin
    git rebase origin/main
    
    print_success "تم المزامنة مع main بنجاح"
    echo ""
}

# 4. Check Status - فحص الحالة
check_status() {
    print_header "حالة المستودع"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMITS_AHEAD=$(git rev-list --count origin/$CURRENT_BRANCH..HEAD 2>/dev/null || echo "0")
    COMMITS_BEHIND=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
    
    echo ""
    echo "الفرع الحالي: $CURRENT_BRANCH"
    echo "التحديثات القادمة: $COMMITS_BEHIND"
    echo "التعديلات المحلية: $COMMITS_AHEAD"
    echo ""
    
    git status
    echo ""
}

# 5. Fetch Only - جلب فقط
fetch_only() {
    print_header "جلب التحديثات (بدون دمج)"
    
    echo -e "\n${YELLOW}جاري الجلب...${NC}\n"
    git fetch origin
    
    print_success "تم الجلب بنجاح"
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMITS_BEHIND=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo "0")
    
    if [ "$COMMITS_BEHIND" != "0" ]; then
        print_info "هناك $COMMITS_BEHIND تحديثات متاحة للسحب"
        print_info "استخدم 'bash scripts/git-commands.sh pull' لسحبها"
    fi
    echo ""
}

# 6. Show Commits - عرض آخر التغييرات
show_commits() {
    print_header "آخر 10 تغييرات"
    echo ""
    git log --oneline -10
    echo ""
}

# 7. Show Diff - عرض الفروقات
show_diff() {
    print_header "الفروقات المحلية"
    echo ""
    
    if git diff --quiet; then
        print_success "لا توجد فروقات"
    else
        git diff
    fi
    echo ""
}

# 8. Stash Changes - تخزين التغييرات مؤقتاً
stash_changes() {
    print_header "تخزين التغييرات مؤقتاً"
    
    if [ -z "$(git status --porcelain)" ]; then
        print_info "لا توجد تغييرات للتخزين"
        return 0
    fi
    
    echo ""
    git stash push -m "Stash at $(date '+%Y-%m-%d %H:%M:%S')"
    print_success "تم تخزين التغييرات"
    echo ""
}

# 9. Pop Stashed Changes - استرجاع التغييرات المخزنة
pop_stashed() {
    print_header "استرجاع التغييرات المخزنة"
    echo ""
    git stash pop
    print_success "تم استرجاع التغييرات"
    echo ""
}

# 10. List Stashes - عرض قائمة التخزينات
list_stashes() {
    print_header "قائمة التغييرات المخزنة"
    echo ""
    git stash list
    echo ""
}

# 11. Update Dependencies - تحديث المكتبات
update_deps() {
    print_header "تحديث المكتبات"
    
    print_info "جاري سحب التحديثات..."
    pull_updates
    
    print_info "جاري تحديث المكتبات..."
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install
        print_success "تم تحديث pnpm packages"
    elif [ -f "yarn.lock" ]; then
        yarn install
        print_success "تم تحديث yarn packages"
    elif [ -f "package-lock.json" ]; then
        npm install
        print_success "تم تحديث npm packages"
    fi
    echo ""
}

# 12. Full Sync - مزامنة كاملة
full_sync() {
    print_header "مزامنة كاملة"
    
    stash_changes
    pull_rebase
    update_deps
    
    print_success "اكتملت المزامنة الكاملة"
    echo ""
}

# Main command handler
case "${1:-help}" in
    pull)
        pull_updates
        ;;
    pull-rebase)
        pull_rebase
        ;;
    sync)
        sync_with_main
        ;;
    status)
        check_status
        ;;
    fetch)
        fetch_only
        ;;
    commits)
        show_commits
        ;;
    diff)
        show_diff
        ;;
    stash)
        stash_changes
        ;;
    pop)
        pop_stashed
        ;;
    stashes)
        list_stashes
        ;;
    deps)
        update_deps
        ;;
    full-sync)
        full_sync
        ;;
    help|--help|-h)
        print_header "أوامر Git المتاحة"
        cat << EOF

الأوامر الأساسية:
  pull              - سحب التحديثات من الفرع الحالي
  pull-rebase       - سحب مع إعادة الأساس (rebase)
  fetch             - جلب التحديثات بدون دمج
  status            - فحص حالة المستودع

المزامنة:
  sync              - مزامنة الفرع الحالي مع main
  full-sync         - مزامنة كاملة (stash + pull + deps)

عرض المعلومات:
  commits           - عرض آخر 10 تغييرات
  diff              - عرض الفروقات المحلية
  stashes           - عرض قائمة التخزينات

إدارة التغييرات:
  stash             - تخزين التغييرات مؤقتاً
  pop               - استرجاع التغييرات المخزنة

التحديثات:
  deps              - سحب + تحديث المكتبات

الأمثلة:
  bash scripts/git-commands.sh pull
  bash scripts/git-commands.sh status
  bash scripts/git-commands.sh full-sync

EOF
        ;;
    *)
        print_error "أمر غير معروف: $1"
        echo "استخدم: bash scripts/git-commands.sh help"
        exit 1
        ;;
esac
