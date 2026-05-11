<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Facture <?php echo e($invoice->reference); ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; }

        .header { background-color: <?php echo e($tenant->primary_color ?? '#2563eb'); ?>; color: #ffffff; padding: 20px 24px; }
        .header-grid  { display: table; width: 100%; }
        .header-left  { display: table-cell; width: 60%; vertical-align: middle; }
        .header-right { display: table-cell; width: 40%; vertical-align: middle; text-align: right; }
        .header h1  { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .header .sub { font-size: 10px; opacity: 0.85; margin-top: 2px; }
        .doc-title  { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .doc-ref    { font-size: 12px; margin-top: 3px; }

        .body { padding: 20px 24px; }

        .meta-grid { display: table; width: 100%; margin-bottom: 18px; }
        .meta-col  { display: table-cell; width: 50%; vertical-align: top; }
        .meta-col + .meta-col { padding-left: 16px; }
        .meta-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; }
        .meta-box h3 { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 5px; }
        .meta-box p  { font-size: 11px; line-height: 1.6; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-top: 4px; }
        .badge-draft    { background:#f1f5f9; color:#475569; }
        .badge-sent     { background:#dbeafe; color:#1d4ed8; }
        .badge-paid     { background:#dcfce7; color:#15803d; }
        .badge-overdue  { background:#fef2f2; color:#b91c1c; }
        .badge-cancelled{ background:#f1f5f9; color:#94a3b8; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .items-table thead tr { background-color: #f1f5f9; }
        .items-table th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .items-table th.num { text-align: right; }
        .items-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
        .items-table td.num { text-align: right; }
        .items-table tbody tr:nth-child(even) td { background-color: #fafafa; }
        .item-sub { font-size: 10px; color: #64748b; }

        .totals-wrap   { display: table; width: 100%; margin-bottom: 16px; }
        .totals-spacer { display: table-cell; width: 55%; }
        .totals-box    { display: table-cell; width: 45%; }
        .totals-row    { display: table; width: 100%; }
        .totals-label  { display: table-cell; padding: 4px 8px; color: #475569; }
        .totals-value  { display: table-cell; padding: 4px 8px; text-align: right; }
        .totals-divider { border-top: 1px solid #e2e8f0; margin: 4px 0; }
        .totals-total .totals-label,
        .totals-total .totals-value {
            font-size: 13px; font-weight: 700;
            color: <?php echo e($tenant->primary_color ?? '#2563eb'); ?>;
            padding-top: 6px;
        }

        .due-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 8px 12px; margin-top: 4px; }
        .due-box p { color: #b91c1c; font-weight: 600; font-size: 12px; }
        .paid-box { background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 8px 12px; margin-top: 4px; }
        .paid-box p { color: #15803d; font-weight: 600; font-size: 12px; }

        .notes-section { margin-top: 16px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 4px; }
        .notes-section h3 { font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
        .notes-section p  { font-size: 11px; line-height: 1.5; color: #475569; }

        .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; color: #94a3b8; font-size: 10px; }
    </style>
</head>
<body>


<div class="header">
    <div class="header-grid">
        <div class="header-left">
            <h1><?php echo e($tenant->name); ?></h1>
            <?php if($tenant->address ?? null): ?> <p class="sub"><?php echo e($tenant->address); ?></p> <?php endif; ?>
            <?php if($tenant->phone   ?? null): ?> <p class="sub"><?php echo e($tenant->phone); ?></p>   <?php endif; ?>
            <?php if($tenant->email   ?? null): ?> <p class="sub"><?php echo e($tenant->email); ?></p>   <?php endif; ?>
            <?php if($tenant->rccm    ?? null): ?> <p class="sub">RCCM : <?php echo e($tenant->rccm); ?></p> <?php endif; ?>
            <?php if($tenant->ninea   ?? null): ?> <p class="sub">NINEA : <?php echo e($tenant->ninea); ?></p> <?php endif; ?>
        </div>
        <div class="header-right">
            <p class="doc-title">Facture</p>
            <p class="doc-ref"><?php echo e($invoice->reference); ?></p>
        </div>
    </div>
</div>

<div class="body">

    
    <div class="meta-grid" style="margin-top:16px">
        <div class="meta-col">
            <div class="meta-box">
                <h3>Détails de la facture</h3>
                <p><strong>Date d'émission :</strong> <?php echo e($invoice->issue_date->format('d/m/Y')); ?></p>
                <?php if($invoice->due_date): ?>
                    <p><strong>Date d'échéance :</strong> <?php echo e($invoice->due_date->format('d/m/Y')); ?></p>
                <?php endif; ?>
                <p><strong>Émise par :</strong> <?php echo e($invoice->user?->name ?? '—'); ?></p>
                <?php
                    $badges = [
                        'draft'     => ['label' => 'Brouillon',   'class' => 'badge-draft'],
                        'sent'      => ['label' => 'Envoyée',     'class' => 'badge-sent'],
                        'paid'      => ['label' => 'Payée',       'class' => 'badge-paid'],
                        'overdue'   => ['label' => 'En retard',   'class' => 'badge-overdue'],
                        'cancelled' => ['label' => 'Annulée',     'class' => 'badge-cancelled'],
                    ];
                    $b = $badges[$invoice->status] ?? ['label' => $invoice->status, 'class' => 'badge-draft'];
                ?>
                <br><span class="badge <?php echo e($b['class']); ?>"><?php echo e($b['label']); ?></span>
            </div>
        </div>
        <div class="meta-col">
            <div class="meta-box">
                <h3>Facturé à</h3>
                <?php if($invoice->customer): ?>
                    <p><strong><?php echo e($invoice->customer->name); ?></strong></p>
                    <?php if($invoice->customer->phone): ?>   <p><?php echo e($invoice->customer->phone); ?></p>   <?php endif; ?>
                    <?php if($invoice->customer->email): ?>   <p><?php echo e($invoice->customer->email); ?></p>   <?php endif; ?>
                    <?php if($invoice->customer->address): ?> <p><?php echo e($invoice->customer->address); ?></p> <?php endif; ?>
                <?php else: ?>
                    <p style="color:#94a3b8">Client non spécifié</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:42%">Désignation</th>
                <th class="num" style="width:12%">Qté</th>
                <th class="num" style="width:16%">Prix unit.</th>
                <th class="num" style="width:12%">Remise</th>
                <th class="num" style="width:18%">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $invoice->items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td>
                    <?php echo e($item->description); ?>

                    <?php if($item->product?->name && $item->product->name !== $item->description): ?>
                        <br><span class="item-sub"><?php echo e($item->product->name); ?></span>
                    <?php endif; ?>
                </td>
                <td class="num">
                    <?php echo e(number_format($item->quantity, $item->quantity == floor($item->quantity) ? 0 : 3)); ?>

                    <?php echo e($item->product?->unit ?? ''); ?>

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
                <div class="totals-value"><?php echo e(number_format($invoice->subtotal, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php if($invoice->discount_amount > 0): ?>
            <div class="totals-row">
                <div class="totals-label">
                    Remise<?php echo e($invoice->discount_type === 'percent' ? ' (' . number_format($invoice->discount_value, 0) . '%)' : ''); ?>

                </div>
                <div class="totals-value" style="color:#b91c1c">− <?php echo e(number_format($invoice->discount_amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php endif; ?>
            <?php if($invoice->tax_amount > 0): ?>
            <div class="totals-row">
                <div class="totals-label">TVA (<?php echo e(number_format($invoice->tax_rate, 0)); ?>%)</div>
                <div class="totals-value"><?php echo e(number_format($invoice->tax_amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php endif; ?>
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <div class="totals-label">TOTAL</div>
                <div class="totals-value"><?php echo e(number_format($invoice->total, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>

            <?php if($invoice->paid_amount > 0): ?>
            <div class="totals-row" style="margin-top:4px">
                <div class="totals-label" style="color:#15803d">Encaissé</div>
                <div class="totals-value" style="color:#15803d"><?php echo e(number_format($invoice->paid_amount, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></div>
            </div>
            <?php endif; ?>
        </div>
    </div>

    
    <?php $due = $invoice->amountDue(); ?>
    <?php if($invoice->isPaid()): ?>
        <div class="paid-box"><p>Facture int&eacute;gralement r&eacute;gl&eacute;e</p></div>
    <?php elseif($due > 0): ?>
        <div class="due-box">
            <p>Reste dû : <?php echo e(number_format($due, 0, ',', ' ')); ?> <?php echo e($tenant->currency); ?></p>
        </div>
    <?php endif; ?>

    
    <?php if($invoice->notes): ?>
    <div class="notes-section" style="margin-top:16px">
        <h3>Notes</h3>
        <p><?php echo e($invoice->notes); ?></p>
    </div>
    <?php endif; ?>

</div>


<div class="footer">
    <p><?php echo e($footer); ?></p>
</div>

</body>
</html>
<?php /**PATH C:\Users\hp\Documents\Gestion Commercial\saas-commercial\backend\resources\views/pdf/invoice_doc.blade.php ENDPATH**/ ?>