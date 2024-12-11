from django.contrib import admin
from .models import IphoneCase, Comment




@admin.register(IphoneCase)
class IphoneCaseAdmin(admin.ModelAdmin):
    """IphoneCase admin customize

        Author : Adrian Crespo Musheghyan
    """
    list_display = ('name', 'price','model', 'color',
                    'number_copies_stock', 'slug', 'score')
    search_fields = ('name', 'price')
    list_filter = ('price', 'number_copies_stock', 'score')
    readonly_fields = ('slug',)

    fieldsets = (
        (None, {
            'fields': ('name','slug','model', 'color', 'path_to_cover_image',)
        }),
        ('Management shop ', {
            'fields': ('price', 'number_copies_stock', 'score')
        }),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Comment admin customize

        Author : Adrian Crespo Musheghyan
    """
    list_display = ('date_time', 'msg', 'case', "user")
    list_filter = ('msg', 'date_time', 'user', 'case')
    readonly_fields = ('date_time',)

    fieldsets = (
        (None, {
            'fields': ('case', 'user')
        }),
        ('Comment', {
            'fields': ('msg', 'date_time')
        }),
    )
