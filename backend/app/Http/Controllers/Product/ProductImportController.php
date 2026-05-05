<?php

namespace App\Http\Controllers\Product;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ImportProductRequest;
use App\Services\ProductImportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductImportController extends Controller
{
    public function __construct(private readonly ProductImportService $importService) {}

    /**
     * Importe des produits depuis un fichier CSV.
     *
     * Réponse JSON :
     * {
     *   "created": 12,
     *   "updated": 3,
     *   "skipped": 1,
     *   "errors": [{ "row": 5, "message": "..." }]
     * }
     */
    public function import(ImportProductRequest $request): JsonResponse
    {
        $filePath       = $request->file('file')->getRealPath();
        $updateExisting = $request->boolean('update_existing', false);

        $result = $this->importService->import($filePath, $updateExisting);

        $status = empty($result['errors']) ? 200 : 207; // 207 Multi-Status si erreurs partielles

        return response()->json([
            'created' => $result['created'],
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'errors'  => $result['errors'],
        ], $status);
    }

    /**
     * Télécharge le fichier CSV modèle pré-rempli avec des exemples.
     */
    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 — requis pour Excel FR
            fputcsv($out, ProductImportService::templateHeaders(), ';');
            foreach (ProductImportService::templateRows() as $row) {
                fputcsv($out, $row, ';');
            }
            fclose($out);
        }, 'modele-import-produits.csv', [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="modele-import-produits.csv"',
        ]);
    }
}
