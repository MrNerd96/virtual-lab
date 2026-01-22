@echo off
git status > git_log.txt 2>&1
git add . >> git_log.txt 2>&1
git commit -m "Update main branch" >> git_log.txt 2>&1
git push origin main >> git_log.txt 2>&1
type git_log.txt
