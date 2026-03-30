from django.db import models


class CrawlLog(models.Model):
    SOURCE_CHOICES = [
        ('myhome', 'MyHome'),
        ('lh', 'LH'),
        ('applyhome', 'ApplyHome'),
    ]

    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('running', '진행중'),
        ('success', '성공'),
        ('failed', '실패'),
        ('partial', '부분성공'),
    ]

    source = models.CharField(max_length=50, choices=SOURCE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    total_items = models.IntegerField(default=0)
    processed_items = models.IntegerField(default=0)
    created_items = models.IntegerField(default=0)
    updated_items = models.IntegerField(default=0)
    failed_items = models.IntegerField(default=0)

    error_message = models.TextField(blank=True, null=True)
    logs = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['source', 'status']),
            models.Index(fields=['started_at']),
        ]

    def __str__(self):
        return f"{self.get_source_display()} - {self.status} ({self.started_at})"
