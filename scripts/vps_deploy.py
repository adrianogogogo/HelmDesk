import paramiko
import sys

# Forcar o stdout e stderr a usarem UTF-8 para evitar erros de charmap no terminal Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ip = "177.153.39.134"
username = "root"
passwords = ["lXde@12#45", "IXde@12#45"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for pwd in passwords:
    try:
        client.connect(ip, username=username, password=pwd, timeout=10)
        connected = True
        break
    except Exception:
        continue

if not connected:
    print("Nao foi possivel autenticar via SSH na VPS.")
    sys.exit(1)

def run_cmd(cmd):
    print(f"\n>>> Executando na VPS: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out)
    if err:
        print(err)

# Atualizar o codigo do repositorio na VPS
run_cmd("git -C /home/ubuntu/HelmDesk stash")
run_cmd("git -C /home/ubuntu/HelmDesk pull origin genspark_ai_developer")

# Recarregar processos do PM2 para aplicar a nova versao da API
run_cmd("pm2 reload relmdesk-backend")
run_cmd("pm2 reload relmdesk-frontend")
run_cmd("pm2 status")

client.close()
print("\nDeploy na VPS concluido com sucesso!")
