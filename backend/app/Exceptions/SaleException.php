<?php

namespace App\Exceptions;

use RuntimeException;

class SaleException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode = 'SALE_ERROR',
    ) {
        parent::__construct($message);
    }

    public function toArray(): array
    {
        return [
            'message' => $this->getMessage(),
            'code'    => $this->errorCode,
        ];
    }
}
