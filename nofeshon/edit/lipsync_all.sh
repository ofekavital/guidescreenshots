# מריץ את כל טווחי הליפסינק לפי הסדר ומדלג על מה שכבר הסתיים (עמיד להפעלה מחדש), ואז מרכיב את 1_ls.mp4.
cd /home/user/guidescreenshots/nofeshon/edit
for r in s5_rebuke s4_roni s1_lecture s3_lecture; do
  [ -f /home/user/footage/work/ls/${r}_ls.mp4 ] && { echo "$r already done"; continue; }
  echo "$r start $(date +%T)"
  (time python3 lipsync.py --only $r) >> /home/user/footage/work/ls/run_all.txt 2>&1
  echo "$r end $(date +%T) $( [ -f /home/user/footage/work/ls/${r}_ls.mp4 ] && echo OK || echo FAIL )"
done
python3 lipsync.py --splice >> /home/user/footage/work/ls/run_all.txt 2>&1 && echo "SPLICED $(date +%T)"
