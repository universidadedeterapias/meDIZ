@echo off
set GIT_PAGER=cat
git checkout main
git merge feature/pdf-export-and-growth
git push origin main
pause
