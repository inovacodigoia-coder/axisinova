import sys

file_path = 'src/components/reception/attendance/lookup/AttendanceDetailsModal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# O script anterior cortou muito conteúdo.
# Vou tentar restaurar o arquivo e aplicar apenas as mudanças necessárias de ScrollArea.
# No entanto, eu não tenho um backup. Vou ter que reconstruir a lógica baseando-me no que li antes.

# Vamos procurar o AlertDialog que foi cortado no meio.
bad_part = """            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}"""

# O que deveria ser (baseado no componente original):
good_part = """            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteOrder();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printSelectionOpen && (
        <AttendancePrintSelectionModal
          open={printSelectionOpen}
          onClose={() => setPrintSelectionOpen(false)}
          order={order}
          selectedExams={selectedExams}
        />
      )}

      {labelsPrintOpen && (
        <SampleLabelsPrintModal
          open={labelsPrintOpen}
          onClose={() => setLabelsPrintOpen(false)}
          order={order}
          selectedTubes={selectedTubes}
        />
      )}

      {printModalOpen && printDoc && (
        <AttendancePrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          document={printDoc}
          autoPrint={false}
          overrideConfig={selectedPrinterOverride}
          vias={enabledVias}
        />
      )}

      {reportPreviewOpen && (
        <PDFPreviewModal
          isOpen={reportPreviewOpen}
          onClose={() => setReportPreviewOpen(false)}
          order={filteredOrderForReport as any}
          onDownload={() => {}}
        />
      )}

      {/* Alterar Previsão Modal */}
      <Dialog open={forecastModalOpen} onOpenChange={setForecastModalOpen}>
        <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-medium text-slate-800">Alterar Previsão</h3>
            <Button variant="ghost" size="icon" onClick={() => setForecastModalOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-6">Conteúdo da Previsão...</div>
        </DialogContent>
      </Dialog>

      {guideEditor && (
        <GuideEditorModal
          open
          mode={guideEditor.mode}
          onClose={() => setGuideEditor(null)}
          guide={guidesState[guideEditor.index]}
          onSave={(updated) => {
            const next = [...guidesState];
            if (guideEditor.mode === 'create') next.push(updated);
            else next[guideEditor.index] = updated;
            persistGuides(next);
            setGuideEditor(null);
          }}
        />
      )}

      {switchConvenioOpen && (
        <SwitchConvenioModal
          open
          onClose={() => setSwitchConvenioOpen(false)}
          onConfirm={(convenio) => {
            const next = guidesState.map(g => ({ ...g, convenioId: convenio.id, convenioName: convenio.name }));
            persistGuides(next);
            setSwitchConvenioOpen(false);
          }}
        />
      )}

      {tissGuideOpen && (
        <TissGuidePrintModal
          open
          onClose={() => setTissGuideOpen(false)}
          order={order}
          patient={patient}
          guide={guidesState[0] || {
            convenioName: order.convenioName,
            doctorName: order.doctorName,
            doctorCRM: order.doctorCRM,
            exams: orderExams,
          }}
        />
      )}

      {clientModalMode && (
        <ClientInfoModal
          open
          mode={clientModalMode}
          onClose={() => setClientModalMode(null)}
          order={order}
          patient={patient}
        />
      )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}"""

# Infelizmente, eu não tenho o conteúdo total dos modais secundários (GuideEditorModal etc)
# Vou tentar restaurar o arquivo lendo-o novamente se possível ou usando o que está em context_summary
# Mas o context_summary não tem o código fonte.

# Vou tentar usar o `code--view` para ver se o arquivo ainda tem as partes que eu preciso em algum lugar
# ou se eu realmente o destruí.

# Na verdade, o `cat` mostrou que o arquivo termina em 1308 linhas agora.
# O original tinha 1393. Perdi ~85 linhas.

# Vou tentar ler o arquivo original de uma versão anterior se o sistema permitir, 
# se não, vou ter que reconstruir o final do componente da melhor forma.

# Felizmente, eu li as linhas 1350-1393 antes do erro.
# 1350:           open
# 1351:           onClose={() => setTissGuideOpen(false)}
# 1352:           order={order}
# 1353:           patient={patient}
# ...

# Vou reconstruir o final do arquivo.
