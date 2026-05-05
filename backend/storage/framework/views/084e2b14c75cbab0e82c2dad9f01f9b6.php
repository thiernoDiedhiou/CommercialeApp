<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Facture <?php echo e($sale->reference); ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; }

        /* ── En-tête ── */
        .header { background-color: <?php echo e($tenant->primary_color ?? '#2563eb'); ?>; color: #ffffff; padding: 20px 24px; }
        .header-grid { display: table; width: 100%; }
        .header-left  { display: table-cell; width: 60%; vertical-align: middle; }
        .header-right { display: table-cell; width: 40%; vertical-align: middle; text-align: right; }
        .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .header .sub { font-size: 10px; opacity: 0.85; margin-top: 2px; }
        .invoice-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-ref   { font-size: 12px; margin-top: 3px; }

        /* ── Corps ── */
        .body { padding: 20px 24px; }

        /* ── Méta : vendeur / client / date ── */
        .meta-grid { display: table; width: 100%; margin-bottom: 18px; }
        .meta-col  { display: table-cell; width: 50%; vertical-align: top; }
        .meta-col + .meta-col { padding-left: 16px; }
        .meta-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; }
        .meta-box h3 { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 5px; }
        .meta-box p  { font-size: 11px; line-height: 1.5; }

        /* ── Tableau des lignes ── */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .items-table thead tr { background-color: #f1f5f9; }
        .items-table th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .items-table th.num { text-align: right; }
        .items-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
        .items-table td.num { text-align: right; }
        .items-table tbody tr:nth-child(even) td { background-color: #fafafa; }
        .item-variant { font-size: 10px; color: #64748b; }

        /* ── Totaux ── */
        .totals-wrap { display: table; width: 100%; margin-bottom: 16px; }
        .totals-spacer { display: table-cell; width: 55%; }
        .totals-box    { display: table-cell; width: 45%; }
        .totals-row    { display: table; width: 100%; }
        .totals-label  { display: table-cell; padding: 4px 8px; color: #475569; }
        .totals-value  { display: table-cell; padding: 4px 8px; text-align: right; }
        .totals-divider { border-top: 1px solid #e2e8f0; margin: 4px 0; }
        .totals-total .totals-label,
        .totals-total .totals-value {
            font-size: 13px;
            font-weight: 700;
            color: <?php echo e($tenant->primary_color ?? '#2563eb'); ?>;
            padding-top: 6px;
        }

        /* ── Paiements ── */
        .payments-section h3 { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; }
        .payments-table { width: 100%; border-collapse: collapse; }
        .payments-table td { padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
        .payments-table td.num { text-align: right; }
        .badge-due { display: inline-block; background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-top: 8px; }

        /* ── Pied de page ── */
        .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; color: #94a3b8; font-size: 10px; }
    </style>
</head>
<body>


<div class="header">
    <div class="header-grid">
        <div class="header-left">
            <h1><?php echo e($tenant->name); ?></h1>
            <?php if($tenant->address ?? null): ?>
                <p class="sub"><?php echo e($tenant->address); ?></p>
            <?php endif; ?>
            <?php if($tenant->phone ?? null): ?>
                <p class="sub"><?php echo e($tenant->phone); ?></p>
            <?php endif; ?>
        </div>
        <div class="header-right">
            <p class="invoice-title">Facture</p>
            <p class="invoice-ref"><?php echo e($sale->reference); ?></p>
        </div>
    </div>
</div>

<div class="body">

    
    <div class="meta-grid" style="margin-top:16px">
        <div class="meta-col">
            <div class="meta-box">
                <h3>Informations</h3>
                <p><strong>Date :</strong> <?php echo e($sale->confirmed_at?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i')); ?></p>
                <p><strong>Vendeur :</strong> <?php echo e($sale->user?->name ?? '—'); ?></p>
                <?php if($sale->note): ?>
                    <p><strong>Note :</strong> <?php echo e($sale->note); ?></p>
                <?php endif; ?>
            </div>
        </div>
        <div class="meta-col">
            <div class="meta-box">
                <h3>Client</h3>
                <?php if($sale->customer): ?>
                    <p><strong><?php echo e($sale->customer->name); ?></strong></p>
                    <?php if($sale->customer->phone): ?>  <p><?php echo e($sale->customer->phone); ?></p>  <?php endif; ?>
                    <?php if($sale->customer->email): ?>  <p><?php echo e($sale->customer->email); ?></p>  <?php endif; ?>
                    <?php if($sale->customer->address): ?><p><?php echo e($sale->customer->address); ?></p><?php endif; ?>
                <?php else: ?>
                    <p style="color:#94a3b8">Client de passage</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:40%">Désignation</th>
                <th class="num" style="width:15%">Qté</th>
                <th class="num" style="width:15%">Prix unit.</th>
                <th class="num" style="width:12%">Remise</th>
                <th class="num" style="width:18%">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $sale->items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td>
                    <?php echo e($item->product?->name ?? 'Produit supprimé'); ?>

                    <?php if($item->variant?->attribute_summary): ?>
                        <br><span class="item-variant"><?php echo e($item->variant->attribute_summary); ?></span>
                    <?php endif; ?>
                    <?php if($item->lot?->lot_number): ?>
                        <br><span class="item-variant">Lot : <?php echo e($item->lot->lot_number); ?></span>
                    <?php endif; ?>
                </td>
                <td class="num">
                    <?php if($item->unit_weight): ?>
                        <?php echo e(number_format($item->unit_weight, 3)); ?> kg
                    <?php else: ?>
                        <?php echo e(number_format($item->quantity, $item->quantity == floor($item->quantity) ? 0 : 2)); ?>

                        <?php echo e($item->product?->unit ?? ''); ?>

                    <?php endif; ?>
                </td>
                <td class="num"><?php echo e(number_format($item->unit_price, 0, ',', ' ')); ?></td>
                <td class="num">
                    <?php if($item->discount > 0): ?>
                        <?php echo e(number_format($item->discount, 0, ',', ' ')); ?>

                    <?php else: ?>
                        —
                    <?php endif; ?>
                </td>
                <td class="num"><strong><?php echo e(number_format($item->total, 0, ',', ' ')); ?></strong></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>

    
    <div class="totals-wrap">
        <div class="totals-spacer"></div>
        <div class="totals-box">
            <div class="totals-row">
                <div class="totals-label">Sous-total</div>
                <div class="totals-value"><?php echo e(number_format($sale->subtotal, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php if($sale->discount_amount > 0): ?>
            <div class="totals-row">
                <div class="totals-label">
                    Remise
                    <?php if($sale->discount_type === 'percent'): ?>
                        (<?php echo e(number_format($sale->discount_value, 0)); ?>%)
                    <?php endif; ?>
                </div>
                <div class="totals-value" style="color:#b91c1c">− <?php echo e(number_format($sale->discount_amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php endif; ?>
            <?php if($sale->tax_amount > 0): ?>
            <div class="totals-row">
                <div class="totals-label">Taxes</div>
                <div class="totals-value"><?php echo e(number_format($sale->tax_amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php endif; ?>
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <div class="totals-label">TOTAL</div>
                <div class="totals-value"><?php echo e(number_format($sale->total, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
        </div>
    </div>

    
    <?php if($sale->payments->isNotEmpty()): ?>
    <div class="payments-section">
        <h3>Règlements</h3>
        <table class="payments-table">
            <?php $__currentLoopData = $sale->payments; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $payment): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><?php echo e(\App\Models\Payment::METHOD_LABELS[$payment->method] ?? $payment->method); ?></td>
                <?php if($payment->reference): ?>
                    <td style="color:#64748b; font-size:10px">Réf. <?php echo e($payment->reference); ?></td>
                <?php else: ?>
                    <td></td>
                <?php endif; ?>
                <td class="num"><?php echo e(number_format($payment->amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </table>

        <?php if($sale->amountRemaining() > 0): ?>
            <p class="badge-due">Reste dû : <?php echo e(number_format($sale->amountRemaining(), 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></p>
        <?php endif; ?>
    </div>
    <?php endif; ?>

</div>


<div class="footer">
    <p><?php echo e($footer); ?></p>
</div>

</body>
</html>
<?php /**PATH C:\Users\hp\Documents\Gestion Commercial\saas-commercial\backend\resources\views/pdf/invoice.blade.php ENDPATH**/ ?>