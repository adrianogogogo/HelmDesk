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

print("✅ Conectado via SSH na VPS de Produção.")
print("⚠️ Executando script SQL de exclusão de tickets com segurança (BEGIN/COMMIT)...")

# Script SQL consolidado com transação
sql_command = (
    "BEGIN; "
    "DELETE FROM attachments WHERE task_id IN (SELECT id FROM tasks WHERE ticket_id IN (SELECT id FROM tickets WHERE ticket_number != 'REL-BIKES-000004')); "
    "DELETE FROM tasks WHERE ticket_id IN (SELECT id FROM tickets WHERE ticket_number != 'REL-BIKES-000004'); "
    "DELETE FROM tickets WHERE ticket_number != 'REL-BIKES-000004'; "
    "COMMIT;"
)

# Comando executando no psql como superusuário postgres
cmd = f'sudo -u postgres psql -d relmdesk -c "{sql_command}"'

stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')

if out:
    print("\n--- Resultado da Execução ---")
    print(out)
if err:
    print("\n--- Mensagens de Aviso / Erro ---")
    print(err)

# Consultando o estado final dos tickets
print("\n🔍 Consultando os tickets restantes na produção...")
cmd_check = 'sudo -u postgres psql -d relmdesk -c "SELECT id, ticket_number, title, created_at FROM tickets ORDER BY ticket_number;"'
stdin, stdout, stderr = client.exec_command(cmd_check)
out_check = stdout.read().decode('utf-8', errors='ignore')
if out_check:
    print("\n--- Estado Final dos Tickets na VPS ---")
    print(out_check)

client.close()
print("\nProcesso concluído!")
