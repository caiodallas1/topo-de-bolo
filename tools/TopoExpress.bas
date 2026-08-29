Attribute VB_Name = "TopoExpress"
Option Explicit

' Topo Express - Exportador de tema para CorelDRAW
' Execute ExportarTopoExpress.
'
' Campos editaveis:
' - Basta DIGITAR @NOME ou @IDADE em um objeto de texto.
' - Tambem continua aceitando objetos cujo Name seja @NOME / @IDADE.
' - Esses objetos NAO viram PNG: viram slots editaveis no site.

Private Const DPI_EXPORT As Long = 300
Private Const DPI_CAPA As Long = 120
Private Const DEFAULT_WHITE_MARGIN_MM As Double = 1.5
Private Const DEFAULT_CUTLINE_MM As Double = 0.2

Public Sub ExportarTopoExpress()
    On Error GoTo TrataErro
    If Documents.Count = 0 Then MsgBox "Abra um arquivo do CorelDRAW.", vbExclamation: Exit Sub
    Dim doc As Document, pg As Page
    Set doc = ActiveDocument: Set pg = ActivePage
    If pg.Shapes.Count = 0 Then MsgBox "A página está vazia.", vbExclamation: Exit Sub

    Dim tema As String, categoria As String
    tema = Trim(InputBox("Nome do tema:", "Topo Express", NomeDocumentoSemExtensao(doc.Name)))
    If tema = "" Then Exit Sub
    categoria = Trim(InputBox("Categoria do tema:", "Topo Express", "Infantil"))
    If categoria = "" Then categoria = "Sem categoria"

    Dim base As String: base = EscolherPasta()
    If base = "" Then Exit Sub
    Dim slug As String: slug = SanitizarNomeArquivo(tema)
    Dim pasta As String, elemDir As String
    pasta = base & "\" & slug & "_TopoExpress": elemDir = pasta & "\elementos"
    CriarPastaSeNaoExiste pasta: CriarPastaSeNaoExiste elemDir

    Dim oldUnit As cdrUnit, oldRef As cdrReferencePoint
    oldUnit = doc.Unit: oldRef = doc.ReferencePoint
    doc.Unit = cdrMillimeter: doc.ReferencePoint = cdrBottomLeft

    Dim pageW As Double, pageH As Double
    pageW = pg.SizeWidth: pageH = pg.SizeHeight
    ExportarCapa doc, pasta & "\capa.png", pg

    Dim elementsJson As String, textJson As String, i As Long, n As Long
    For i = 1 To pg.Shapes.Count
        Dim shp As Shape: Set shp = pg.Shapes(i)
        If EhObjetoIgnorado(shp) Then GoTo prox

        Dim nm As String: nm = Trim(shp.Name)
        Dim marcador As String: marcador = MarcadorTexto(shp)

        If marcador = "@NOME" Or marcador = "@IDADE" Then
            If textJson <> "" Then textJson = textJson & "," & vbCrLf
            textJson = textJson & TextoSlotJson(shp, IIf(marcador = "@NOME", "name", "age"), pageH)
        Else
            n = n + 1
            If nm = "" Then nm = "elemento_" & Format(n, "000")
            Dim fn As String: fn = Format(n, "000") & "_" & SanitizarNomeArquivo(nm) & ".png"
            ExportarShapePNG doc, shp, elemDir & "\" & fn
            If elementsJson <> "" Then elementsJson = elementsJson & "," & vbCrLf
            elementsJson = elementsJson & ElementoJson(shp, n, nm, "elementos/" & fn, pageH)
        End If
prox:
    Next i

    Dim json As String
    json = "{" & vbCrLf & _
      "  ""version"": 3," & vbCrLf & _
      "  ""source"": ""CorelDRAW TopoExpress.bas""," & vbCrLf & _
      "  ""theme"": {""name"": """ & JsonEscape(tema) & """, ""category"": """ & JsonEscape(categoria) & """, ""cover"": ""capa.png""}," & vbCrLf & _
      "  ""page"": {""widthMm"": " & JsonNum(pageW) & ", ""heightMm"": " & JsonNum(pageH) & "}," & vbCrLf & _
      "  ""cutline"": {""whiteMarginMm"": " & JsonNum(DEFAULT_WHITE_MARGIN_MM) & ", ""lineWidthMm"": " & JsonNum(DEFAULT_CUTLINE_MM) & ", ""color"": ""#9CA3AF""}," & vbCrLf & _
      "  ""elements"": [" & vbCrLf & elementsJson & vbCrLf & "  ]," & vbCrLf & _
      "  ""textSlots"": [" & vbCrLf & textJson & vbCrLf & "  ]" & vbCrLf & "}"

    SalvarTextoUTF8SemBOM pasta & "\manifest.json", json
    doc.ReferencePoint = oldRef: doc.Unit = oldUnit

    Dim zipPath As String: zipPath = base & "\" & slug & "_TopoExpress.zip"
    Call CriarZipPowerShell(pasta, zipPath)
    MsgBox "Pacote criado!" & vbCrLf & pasta & vbCrLf & zipPath, vbInformation, "Topo Express"
    Exit Sub
TrataErro:
    On Error Resume Next
    doc.ReferencePoint = oldRef: doc.Unit = oldUnit
    MsgBox "Erro: " & Err.Number & " - " & Err.Description, vbCritical, "Topo Express"
End Sub

' Detecta primeiro pelo nome interno do objeto e depois pelo CONTEUDO do texto.
' Assim o usuario pode simplesmente escrever @NOME / @IDADE no Corel.
Private Function MarcadorTexto(ByVal shp As Shape) As String
    On Error Resume Next

    Dim valor As String
    valor = UCase$(Trim$(shp.Name))
    If valor = "@NOME" Or valor = "@IDADE" Then
        MarcadorTexto = valor
        Exit Function
    End If

    If shp.Type = cdrTextShape Then
        valor = UCase$(Trim$(shp.Text.Story.Text))
        valor = Replace(valor, vbCr, "")
        valor = Replace(valor, vbLf, "")
        valor = Trim$(valor)
        If valor = "@NOME" Or valor = "@IDADE" Then
            MarcadorTexto = valor
            Exit Function
        End If
    End If

    MarcadorTexto = ""
End Function

Private Function EhObjetoIgnorado(ByVal shp As Shape) As Boolean
    On Error Resume Next
    EhObjetoIgnorado = (shp.Visible = False Or shp.Type = cdrGuidelineShape)
End Function

Private Sub ExportarShapePNG(ByVal doc As Document, ByVal shp As Shape, ByVal caminho As String)
    shp.CreateSelection
    Dim pxW As Long, pxH As Long
    pxW = CLng((shp.SizeWidth / 25.4) * DPI_EXPORT): pxH = CLng((shp.SizeHeight / 25.4) * DPI_EXPORT)
    If pxW < 32 Then pxW = 32
    If pxH < 32 Then pxH = 32
    Dim ex As ExportFilter
    Set ex = doc.ExportBitmap(caminho, cdrPNG, cdrSelection, cdrRGBColorImage, pxW, pxH, DPI_EXPORT, DPI_EXPORT, cdrNormalAntiAliasing, True, False, True, False, cdrCompressionNone)
    ex.Finish
End Sub

Private Sub ExportarCapa(ByVal doc As Document, ByVal caminho As String, ByVal pg As Page)
    On Error Resume Next
    Dim w As Long, h As Long: w = 900: h = CLng(w * (pg.SizeHeight / pg.SizeWidth))
    Dim ex As ExportFilter
    Set ex = doc.ExportBitmap(caminho, cdrPNG, cdrCurrentPage, cdrRGBColorImage, w, h, DPI_CAPA, DPI_CAPA, cdrNormalAntiAliasing, True, False, True, False, cdrCompressionNone)
    ex.Finish
End Sub

Private Function ElementoJson(ByVal shp As Shape, ByVal idx As Long, ByVal nm As String, ByVal arq As String, ByVal ph As Double) As String
    Dim x As Double, y As Double, w As Double, h As Double
    x = shp.LeftX: y = ph - shp.TopY: w = shp.SizeWidth: h = shp.SizeHeight
    ElementoJson = "    {""id"": ""el-" & Format(idx, "000") & """, ""name"": """ & JsonEscape(nm) & """, ""file"": """ & JsonEscape(arq) & """, ""xMm"": " & JsonNum(x) & ", ""yMm"": " & JsonNum(y) & ", ""widthMm"": " & JsonNum(w) & ", ""heightMm"": " & JsonNum(h) & ", ""movable"": true, ""resizable"": true, ""removable"": true}"
End Function

Private Function TextoSlotJson(ByVal shp As Shape, ByVal typ As String, ByVal ph As Double) As String
    Dim f As String, sz As Double: f = "Arial": sz = 36
    On Error Resume Next
    If shp.Type = cdrTextShape Then
        f = shp.Text.Story.Font
        sz = shp.Text.Story.Size
    End If
    On Error GoTo 0

    TextoSlotJson = "    {""type"": """ & typ & """, ""xMm"": " & JsonNum(shp.LeftX) & ", ""yMm"": " & JsonNum(ph - shp.TopY) & ", ""widthMm"": " & JsonNum(shp.SizeWidth) & ", ""heightMm"": " & JsonNum(shp.SizeHeight) & ", ""fontFamily"": """ & JsonEscape(f) & """, ""fontSizePt"": " & JsonNum(sz) & ", ""fill"": ""#111111""}"
End Function

Private Function CriarZipPowerShell(ByVal pasta As String, ByVal zipPath As String) As Boolean
    On Error GoTo falhou
    Dim cmd As String
    cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""$ErrorActionPreference='Stop'; if(Test-Path -LiteralPath '" & PsEscape(zipPath) & "'){Remove-Item -LiteralPath '" & PsEscape(zipPath) & "' -Force}; Compress-Archive -Path '" & PsEscape(pasta) & "\*' -DestinationPath '" & PsEscape(zipPath) & "' -Force"""
    CriarZipPowerShell = (CreateObject("WScript.Shell").Run(cmd, 0, True) = 0): Exit Function
falhou:
    CriarZipPowerShell = False
End Function

Private Function EscolherPasta() As String
    On Error GoTo fb
    Dim sh As Object, f As Object: Set sh = CreateObject("Shell.Application")
    Set f = sh.BrowseForFolder(0, "Escolha onde salvar o pacote Topo Express", 0, 0)
    If f Is Nothing Then EscolherPasta = "" Else EscolherPasta = f.Self.Path
    Exit Function
fb: EscolherPasta = Environ$("USERPROFILE") & "\Desktop"
End Function

Private Sub CriarPastaSeNaoExiste(ByVal p As String)
    If Dir(p, vbDirectory) = "" Then MkDir p
End Sub

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

Private Function JsonEscape(ByVal s As String) As String
    s = Replace(s, "\", "\\"): s = Replace(s, """", "\""")
    s = Replace(s, vbCrLf, "\n"): s = Replace(s, vbCr, "\n"): s = Replace(s, vbLf, "\n")
    JsonEscape = s
End Function

Private Function JsonNum(ByVal n As Double) As String
    JsonNum = Trim$(Str$(Round(n, 3)))
End Function

Private Function SanitizarNomeArquivo(ByVal s As String) As String
    Dim a As Variant, v As Variant: a = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For Each v In a: s = Replace(s, CStr(v), "_"): Next v
    s = Replace(Trim(s), " ", "_"): If s = "" Then s = "tema": SanitizarNomeArquivo = s
End Function

Private Function NomeDocumentoSemExtensao(ByVal s As String) As String
    Dim p As Long: p = InStrRev(s, "."): If p > 1 Then NomeDocumentoSemExtensao = Left(s, p - 1) Else NomeDocumentoSemExtensao = s
End Function

Private Function PsEscape(ByVal s As String) As String
    PsEscape = Replace(s, "'", "''")
End Function
