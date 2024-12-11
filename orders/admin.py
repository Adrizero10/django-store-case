from django.contrib import admin
from .models import Order, OrderItem, TransaccionPaypal


class OrderItemsInline(admin.TabularInline):
    """Display inline orderitems on orders admin

        Author : Adrian Crespo Musheghyan
    """
    model = OrderItem


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Order admin customize

        Author : Adrian Crespo Musheghyan
    """
    list_display = ('first_name', 'last_name', 'email', 'address',
                    'postal_code', 'city', 'created', 'updated', 'paid')

    search_fields = ('first_name', 'last_name', 'email', 'address',
                     'postal_code', 'city', 'created', 'paid')

    list_filter = ('address', 'postal_code', 'city', 'created', 'paid')

    readonly_fields = ('created', 'updated')

    fieldsets = (
        ('Shipping data', {
            'fields': ('first_name', 'last_name', 'email', 'address',
                       'postal_code', 'city',)
        }),
        ('Shipping information', {
            'fields': ('created', 'updated', 'paid')
        }),
    )

    inlines = [OrderItemsInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """OrderItem admin customize

        Author : Adrian Crespo Musheghyan
    """
    list_display = ('order', 'case', 'price', 'quantity')

    search_fields = ('order', 'case', 'price', 'quantity')

    list_filter = ('order', 'case', 'price', 'quantity')


@admin.register(TransaccionPaypal)
class TransaccionPaypalAdmin(admin.ModelAdmin):

    list_display = ('payer_id',
    'payment_date',
    'payment_status',
    'quantity',
    'invoce',
    'first_name',
    'payer_status' ,
    'payer_email' ,
    'txn_id' ,
    'receiver_id',
    'payment_gross' ,
    'custom' )
