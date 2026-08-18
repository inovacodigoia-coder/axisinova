import sys

file_path = 'src/components/reception/attendance/lookup/AttendanceDetailsModal.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# A partir da linha 1352 (índice 1351), vamos fechar corretamente
new_tail = [
    '      </ScrollArea>\n',
    '    </DialogContent>\n',
    '  </Dialog>\n',
    '  )\n',
    '}\n',
    '\n',
    'function PaymentCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {\n',
    '  return (\n',
    '    <div className="bg-white rounded-lg border border-border flex overflow-hidden shadow-sm h-14">\n',
    '      <div className={cn("w-10 flex items-center justify-center text-white shrink-0", color)}>\n',
    '        {icon}\n',
    '      </div>\n',
    '      <div className="flex-1 px-3 flex flex-col justify-center min-w-0">\n',
    '        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter leading-tight">{label}</span>\n',
    '        <span className="text-[10px] font-black text-foreground uppercase truncate leading-tight">{value}</span>\n',
    '      </div>\n',
    '      <div className="w-6 flex items-center justify-center border-l border-border hover:bg-muted cursor-pointer">\n',
    '        <MoreVertical className="h-3 w-3 text-muted-foreground" />\n',
    '      </div>\n',
    '    </div>\n',
    '  )\n',
    '}\n'
]

# Cortar o arquivo na linha 1352
final_lines = lines[:1351] + new_tail

with open(file_path, 'w') as f:
    f.writelines(final_lines)
print("Sucesso")

