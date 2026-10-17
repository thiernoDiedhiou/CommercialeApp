<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Type : facture ou devis
            $table->enum('type', ['invoice', 'quote'])->default('invoice')->after('uid');

            // Lien entre devis et facture convertie
            $table->unsignedBigInteger('converted_to_id')->nullable()->after('type');
            $table->foreign('converted_to_id')->references('id')->on('invoices')->nullOnDelete();

            // Avoir : lien vers la facture d'origine
            $table->unsignedBigInteger('credit_note_for_id')->nullable()->after('converted_to_id');
            $table->foreign('credit_note_for_id')->references('id')->on('invoices')->nullOnDelete();

            // Relances
            $table->unsignedTinyInteger('reminder_count')->default(0)->after('cancelled_at');
            $table->timestamp('last_reminder_at')->nullable()->after('reminder_count');

            // Template PDF choisi
            $table->string('pdf_template', 30)->nullable()->after('footer');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['converted_to_id']);
            $table->dropForeign(['credit_note_for_id']);
            $table->dropColumn([
                'type', 'converted_to_id', 'credit_note_for_id',
                'reminder_count', 'last_reminder_at', 'pdf_template',
            ]);
        });
    }
};
