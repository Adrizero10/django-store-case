from django import template

register = template.Library()

@register.filter
def multiply(value, arg):
    """Multiplica el valor por el argumento proporcionado y redondea a 2 decimales"""
    try:
        result = float(value) * float(arg)
        return round(result, 2)  # Redondea a 2 decimales
    except (ValueError, TypeError):
        return 0
