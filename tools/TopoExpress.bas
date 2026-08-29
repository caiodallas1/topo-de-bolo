Attribute VB_Name = "TopoExpress"
Option Explicit

Private Const DPI_EXPORT As Long = 300
Private Const DPI_CAPA As Long = 120

Public Sub ExportarTopoExpress()
    Dim erroNumero As Long, erroDescricao As String
    On Error GoTo TrataErro

    If Documents.Count = 0 Then MsgBox "Abra um arquivo do CorelDRAW.", vbExclamation: Exit Sub

    Dim doc As Document, pg As Page
    Set doc = ActiveDocument
    Set pg = ActivePage
    If pg.Shapes.Count = 0 Then MsgBox "A página está vazia.", vbExclamation: Exit Sub

    Dim tema As String, categoria As String
    tema = Trim$(InputBox("Nome do tema:", "Topo Express", NomeDocumentoSemExtensao(doc.Name)))
    If tema = "" Then Exit Sub
    categoria = Trim$(InputBox("Categoria do tema:", "Topo Express", "Infantil"))
    If categoria = "" Then categoria = "Sem categoria"

    Dim base As String
    base = EscolherPasta()
    If base = "" Then Exit Sub

    Dim slug As String, pasta As String, elemDir As String
    slug = SanitizarNomeArquivo(tema)
    pasta = base & "\" & slug & "_TopoExpress"
    elemDir = pasta & "\elementos"
    CriarPastaSeNaoExiste pasta
    CriarPastaSeNaoExiste elemDir

    Dim oldUnit As cdrUnit, oldRef As cdrReferencePoint
    oldUnit = doc.Unit
    oldRef = doc.ReferencePoint
    doc.Unit = cdrMillimeter
    doc.ReferencePoint = cdrBottomLeft

    Dim pageW As Double, pageH As Double
    pageW = pg.SizeWidth
    pageH = pg.SizeHeight
    ExportarCapa doc, pasta & "\capa.png", pg

    Dim slotShapes As Collection, slotTypes As Collection
    Set slotShapes = New Collection
    Set slotTypes = New Collection

    Dim i As Long
    For i = 1 To pg.Shapes.Count
        ColetarSlotsRecursivo pg.Shapes(i), slotShapes, slotTypes
    Next i

    Dim textJson As String
    For i = 1 To slotShapes.Count
        If textJson <> "" Then textJson = textJson & "," & vbCrLf
        textJson = textJson & TextoSlotJson(slotShapes(i), CStr(slotTypes(i)), pageH)
    Next i

    Dim elementsJson As String, n As Long, shp As Shape
    For i = 1 To pg.Shapes.Count
        Set shp = pg.Shapes(i)
        If EhObjetoIgnorado(shp) Then GoTo ProximoElemento
        If TipoSlot(shp) <> "" Then GoTo ProximoElemento

        n = n + 1
        Dim nm As String, fn As String
        nm = Trim$(shp.Name)
        If nm = "" Then nm = "elemento_" & Format$(n, "000")
        fn = Format$(n, "000") & "_" & SanitizarNomeArquivo(nm) & ".png"

        If shp.Type = cdrGroupShape And GrupoTemSlot(shp) Then
            ExportarGrupoSemSlots doc, shp, elemDir & "\" & fn
        Else
            ExportarShapePNG doc, shp, elemDir & "\" & fn
        End If

        If elementsJson <> "" Then elementsJson = elementsJson & "," & vbCrLf
        elementsJson = elementsJson & ElementoJson(shp, n, nm, "elementos/" & fn, pageH)
ProximoElemento:
    Next i

    Dim json As String
    json = "{" & vbCrLf & _
        "  ""version"": 3," & vbCrLf & _
        "  ""source"": ""CorelDRAW TopoExpress v3.1""," & vbCrLf & _
        "  ""theme"": {""name"": """ & JsonEscape(tema) & """, ""category"": """ & JsonEscape(categoria) & """, ""cover"": ""capa.png""}," & vbCrLf & _
        "  ""page"": {""widthMm"": " & JsonNum(pageW) & ", ""heightMm"": " & JsonNum(pageH) & "}," & vbCrLf & _
        "  ""elements"": [" & vbCrLf & elementsJson & vbCrLf & "  ]," & vbCrLf & _
        "  ""textSlots"": [" & vbCrLf & textJson & vbCrLf & "  ]" & vbCrLf & _
        "}"

    SalvarTextoUTF8SemBOM pasta & "\manifest.json", json
    doc.ReferencePoint = oldRef
    doc.Unit = oldUnit

    Dim zipPath As String
    zipPath = base & "\" & slug & "_TopoExpress.zip"

    If CriarZipPowerShell(pasta, zipPath) Then
        MsgBox "Pacote criado com sucesso!" & vbCrLf & vbCrLf & _
               "ZIP: " & zipPath & vbCrLf & _
               "Campos editáveis detectados: " & slotShapes.Count, vbInformation, "Topo Express"
    Else
        MsgBox "Arquivos exportados, mas o ZIP automático falhou." & vbCrLf & pasta, vbExclamation, "Topo Express"
    End If
    Exit Sub

TrataErro:
    erroNumero = Err.Number
    erroDescricao = Err.Description
    On Error Resume Next
    doc.ReferencePoint = oldRef
    doc.Unit = oldUnit
    On Error GoTo 0
    MsgBox "Erro " & erroNumero & ": " & erroDescricao, vbCritical, "Topo Express v3.1"
End Sub

Private Function TipoSlot(ByVal shp As Shape) As String
    On Error Resume Next
    Dim nomeObj As String
    nomeObj = UCase$(Trim$(shp.Name))
    If nomeObj = "@NOME" Then TipoSlot = "name": Exit Function
    If nomeObj = "@IDADE" Then TipoSlot = "age": Exit Function

    If shp.Type = cdrTextShape Then
        Dim conteudo As String
        conteudo = UCase$(Trim$(Replace$(Replace$(Replace$(CStr(shp.Text.Story.Text), vbCrLf, ""), vbCr, ""), vbLf, "")))
        If conteudo = "@NOME" Then TipoSlot = "name": Exit Function
        If conteudo = "@IDADE" Then TipoSlot = "age": Exit Function
    End If
    TipoSlot = ""
End Function

Private Sub ColetarSlotsRecursivo(ByVal shp As Shape, ByRef shapes As Collection, ByRef types As Collection)
    On Error GoTo Sair
    Dim typ As String
    typ = TipoSlot(shp)
    If typ <> "" Then
        shapes.Add shp
        types.Add typ
        Exit Sub
    End If

    If shp.Type = cdrGroupShape Then
        Dim i As Long
        For i = 1 To shp.Shapes.Count
            ColetarSlotsRecursivo shp.Shapes(i), shapes, types
        Next i
    End If
Sair:
End Sub

Private Function GrupoTemSlot(ByVal shp As Shape) As Boolean
    On Error GoTo NaoTem
    If shp.Type <> cdrGroupShape Then Exit Function

    Dim i As Long, child As Shape
    For i = 1 To shp.Shapes.Count
        Set child = shp.Shapes(i)
        If TipoSlot(child) <> "" Then GrupoTemSlot = True: Exit Function
        If child.Type = cdrGroupShape Then
            If GrupoTemSlot(child) Then GrupoTemSlot = True: Exit Function
        End If
    Next i
NaoTem:
End Function

Private Sub RemoverSlotsRecursivo(ByVal shp As Shape)
    On Error GoTo Sair
    If shp.Type <> cdrGroupShape Then Exit Sub

    Dim i As Long, child As Shape
    For i = shp.Shapes.Count To 1 Step -1
        Set child = shp.Shapes(i)
        If TipoSlot(child) <> "" Then
            child.Delete
        ElseIf child.Type = cdrGroupShape Then
            RemoverSlotsRecursivo child
        End If
    Next i
Sair:
End Sub

Private Function EhObjetoIgnorado(ByVal shp As Shape) As Boolean
    On Error Resume Next
    EhObjetoIgnorado = (shp.Type = cdrGuidelineShape)
End Function

Private Sub ExportarGrupoSemSlots(ByVal doc As Document, ByVal original As Shape, ByVal caminho As String)
    Dim copia As Shape
    On Error GoTo Falhou
    Set copia = original.Duplicate
    RemoverSlotsRecursivo copia
    ExportarShapePNG doc, copia, caminho
    copia.Delete
    Exit Sub
Falhou:
    Dim n As Long, d As String
    n = Err.Number: d = Err.Description
    On Error Resume Next
    If Not copia Is Nothing Then copia.Delete
    On Error GoTo 0
    Err.Raise n, "ExportarGrupoSemSlots", d
End Sub

Private Sub ExportarShapePNG(ByVal doc As Document, ByVal shp As Shape, ByVal caminho As String)
    shp.CreateSelection
    Dim pxW As Long, pxH As Long
    pxW = CLng((shp.SizeWidth / 25.4) * DPI_EXPORT)
    pxH = CLng((shp.SizeHeight / 25.4) * DPI_EXPORT)
    If pxW < 32 Then pxW = 32
    If pxH < 32 Then pxH = 32

    Dim ex As ExportFilter
    Set ex = doc.ExportBitmap(caminho, cdrPNG, cdrSelection, cdrRGBColorImage, pxW, pxH, DPI_EXPORT, DPI_EXPORT, cdrNormalAntiAliasing, True, False, True, False, cdrCompressionNone)
    ex.Finish
End Sub

Private Sub ExportarCapa(ByVal doc As Document, ByVal caminho As String, ByVal pg As Page)
    On Error Resume Next
    Dim w As Long, h As Long
    w = 900
    h = CLng(w * (pg.SizeHeight / pg.SizeWidth))
    Dim ex As ExportFilter
    Set ex = doc.ExportBitmap(caminho, cdrPNG, cdrCurrentPage, cdrRGBColorImage, w, h, DPI_CAPA, DPI_CAPA, cdrNormalAntiAliasing, True, False, True, False, cdrCompressionNone)
    ex.Finish
End Sub

Private Function ElementoJson(ByVal shp As Shape, ByVal idx As Long, ByVal nm As String, ByVal arq As String, ByVal ph As Double) As String
    Dim x As Double, y As Double, w As Double, h As Double
    x = shp.LeftX: y = ph - shp.TopY: w = shp.SizeWidth: h = shp.SizeHeight
    ElementoJson = "    {""id"": ""el-" & Format$(idx, "000") & """, ""name"": """ & JsonEscape(nm) & """, ""file"": """ & JsonEscape(arq) & """, ""xMm"": " & JsonNum(x) & ", ""yMm"": " & JsonNum(y) & ", ""widthMm"": " & JsonNum(w) & ", ""heightMm"": " & JsonNum(h) & ", ""movable"": true, ""resizable"": true, ""removable"": true}"
End Function

Private Function TextoSlotJson(ByVal shp As Shape, ByVal typ As String, ByVal ph As Double) As String
    Dim fonte As String, tamanho As Double
    fonte = "Arial": tamanho = 36
    On Error Resume Next
    If shp.Type = cdrTextShape Then
        fonte = CStr(shp.Text.Story.Font)
        tamanho = CDbl(shp.Text.Story.Size)
    End If
    On Error GoTo 0

    TextoSlotJson = "    {""type"": """ & typ & """, ""xMm"": " & JsonNum(shp.LeftX) & ", ""yMm"": " & JsonNum(ph - shp.TopY) & ", ""widthMm"": " & JsonNum(shp.SizeWidth) & ", ""heightMm"": " & JsonNum(shp.SizeHeight) & ", ""fontFamily"": """ & JsonEscape(fonte) & """, ""fontSizePt"": " & JsonNum(tamanho) & ", ""fill"": ""#111111"", ""stroke"": """", ""strokeWidthMm"": 0}"
End Function

Private Function JsonEscape(ByVal s As String) As String
    s = Replace$(s, "\", "\\")
    s = Replace$(s, """", "\""")
    s = Replace$(s, vbCrLf, "\n")
    s = Replace$(s, vbCr, "\n")
    s = Replace$(s, vbLf, "\n")
    JsonEscape = s
End Function

Private Function JsonNum(ByVal n As Double) As String
    JsonNum = Trim$(Str$(Round(n, 3)))
End Function

Private Sub SalvarTextoUTF8SemBOM(ByVal caminho As String, ByVal conteudo As String)
    Dim txt As Object, bin As Object
    Set txt = CreateObject("ADODB.Stream")
    txt.Type = 2: txt.Charset = "utf-8": txt.Open
    txt.WriteText conteudo
    txt.Position = 3
    txt.Type = 1

    Set bin = CreateObject("ADODB.Stream")
    bin.Type = 1: bin.Open
    bin.Write txt.Read
    bin.SaveToFile caminho, 2
    bin.Close: txt.Close
End Sub

Private Function CriarZipPowerShell(ByVal pasta As String, ByVal zipPath As String) As Boolean
    On Error GoTo Falhou
    Dim cmd As String
    cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""$ErrorActionPreference='Stop'; if(Test-Path -LiteralPath '" & PsEscape(zipPath) & "'){Remove-Item -LiteralPath '" & PsEscape(zipPath) & "' -Force}; Compress-Archive -Path '" & PsEscape(pasta) & "\*' -DestinationPath '" & PsEscape(zipPath) & "' -Force"""
    CriarZipPowerShell = (CreateObject("WScript.Shell").Run(cmd, 0, True) = 0)
    Exit Function
Falhou:
    CriarZipPowerShell = False
End Function

Private Function EscolherPasta() As String
    On Error GoTo Fallback
    Dim sh As Object, f As Object
    Set sh = CreateObject("Shell.Application")
    Set f = sh.BrowseForFolder(0, "Escolha onde salvar o pacote Topo Express", 0, 0)
    If f Is Nothing Then EscolherPasta = "" Else EscolherPasta = f.Self.Path
    Exit Function
Fallback:
    EscolherPasta = Environ$("USERPROFILE") & "\Desktop"
End Function

Private Sub CriarPastaSeNaoExiste(ByVal p As String)
    If Dir$(p, vbDirectory) = "" Then MkDir p
End Sub

Private Function SanitizarNomeArquivo(ByVal s As String) As String
    Dim a As Variant, v As Variant
    a = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For Each v In a
        s = Replace$(s, CStr(v), "_")
    Next v
    s = Replace$(Trim$(s), " ", "_")
    If s = "" Then s = "tema"
    SanitizarNomeArquivo = s
End Function

Private Function NomeDocumentoSemExtensao(ByVal s As String) As String
    Dim p As Long
    p = InStrRev(s, ".")
    If p > 1 Then NomeDocumentoSemExtensao = Left$(s, p - 1) Else NomeDocumentoSemExtensao = s
End Function

Private Function PsEscape(ByVal s As String) As String
    PsEscape = Replace$(s, "'", "''")
End Function
