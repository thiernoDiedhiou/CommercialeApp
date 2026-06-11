<?php

namespace App\Notifications;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewTenantRegisteredNotification extends Notification
{
    public function __construct(
        public readonly Tenant $tenant,
        public readonly User   $admin,
        public readonly string $source = 'admin', // 'admin' | 'landing'
    ) {}

    public function via(mixed $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $source = $this->source === 'landing' ? 'depuis la landing page' : 'depuis le back-office';

        return (new MailMessage())
            ->subject("Nouveau tenant inscrit — {$this->tenant->name}")
            ->greeting('Bonjour !')
            ->line("Un nouveau compte vient d'être créé **{$source}**.")
            ->line("**Commerce :** {$this->tenant->name}")
            ->line("**Secteur :** {$this->tenant->sector}")
            ->line("**Devise :** {$this->tenant->currency}")
            ->line("**Admin :** {$this->admin->name} ({$this->admin->email})")
            ->action('Voir le tenant', rtrim(env('FRONTEND_URL', config('app.url')), '/') . "/admin/tenants/{$this->tenant->id}")
            ->salutation('— DiDi Sphere');
    }

    public function toDatabase(mixed $notifiable): array
    {
        return [
            'type'         => 'new_tenant',
            'source'       => $this->source,
            'tenant_id'    => $this->tenant->id,
            'tenant_name'  => $this->tenant->name,
            'tenant_slug'  => $this->tenant->slug,
            'sector'       => $this->tenant->sector,
            'currency'     => $this->tenant->currency,
            'admin_name'   => $this->admin->name,
            'admin_email'  => $this->admin->email,
        ];
    }
}
