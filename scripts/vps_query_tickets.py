import paramiko
import sys

# Forçar o stdout e stderr a usarem UTF-8 para evitar erros de charmap no terminal Windows
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
    print("❌ Não foi possível se conectar via SSH na VPS.")
    sys.exit(1)

print("✅ Conectado via SSH na VPS. Executando consulta de tickets no PostgreSQL de produção...")

# Comando para listar todos os tickets no PostgreSQL
cmd = 'sudo -u postgres psql -d relmdesk -c "SELECT id, ticket_number, title, created_at FROM tickets ORDER BY ticket_number;"'

stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')

if out:
    print("\n--- Tickets na VPS (Produção) ---")
    print(out)
if err:
    print("\n--- Erro na consulta ---")
    print(err)

client.close()
