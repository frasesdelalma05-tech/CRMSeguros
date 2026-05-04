import subprocess
import time
import os
import signal

log_file = open('/home/z/my-project/dev.log', 'a')

while True:
    log_file.write(f"\n--- Starting dev server at {time.strftime('%H:%M:%S')} ---\n")
    log_file.flush()
    
    proc = subprocess.Popen(
        ['node', 'node_modules/.bin/next', 'dev', '-p', '3000'],
        cwd='/home/z/my-project',
        stdout=log_file,
        stderr=subprocess.STDOUT,
        start_new_session=True
    )
    
    # Wait for the process to exit
    retcode = proc.wait()
    log_file.write(f"\n--- Server exited with code {retcode} at {time.strftime('%H:%M:%S')} ---\n")
    log_file.flush()
    
    # Wait before restarting
    time.sleep(3)

