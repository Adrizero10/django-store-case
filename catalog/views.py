from django.shortcuts import render, get_object_or_404, redirect
from catalog.models import IphoneCase, Comment
from django.db.models import Q
from django.views.generic import ListView
from django.contrib.auth.decorators import login_required

# from django.core.paginator import Paginator

# Create your views here.
from orders.forms import CartAddIphoneCaseForm

def homeCasesListView(request):
    """homeCasesListView

        Displays the home screen with the available
        cases and a list of the 5 cases with the highest
        scores and the 5 most recent cases

        Author : Adrian Crespo Musheghyan
    """

    cases = IphoneCase.objects.all()
    cases_topScore = IphoneCase.objects.order_by(
        '-score').values_list('id', flat=True)[:5]
    # Lista predefinida para ordenar los modelos de iPhone
    model_order = [
        "16 Pro Max", "16 Pro", "16", 
        "15 Pro Max", "15 Pro", "15", 
        "14 Pro Max", "14 Pro", "14", 
        "13 Pro Max", "13 Pro", "13"
    ]

    # Lista predefinida para ordenar los colores
    color_order = [
        "Negro", "Blanco", "Azul", "Rojo", "Dorado", "Verde", "Morado", "Plateado"
    ]

    # Obtener modelos y colores únicos
    models = IphoneCase.objects.all().values_list('model', flat=True).distinct()
    models = sorted(set(models), key=lambda x: model_order.index(x) if x in model_order else len(model_order))

    colors = IphoneCase.objects.all().values_list('color', flat=True).distinct()
    colors = sorted(set(colors), key=lambda x: color_order.index(x) if x in color_order else len(color_order))


    
    template_name = 'home.html'
    context = {'cases': cases, 'cases_topScore': cases_topScore, 'models': models, 'colors': colors,
                }

    return render(request, template_name, context)


class homeCasesSearchView(ListView):
    """homeIphoneCasesListView

        Class that shows a list with the liters
        found in the search string function

    Author : Adrian Crespo Musheghyan
    """
    model = IphoneCase
    template_name = 'search.html'
    paginate_by = 5
    is_paginated = True

    def get_queryset(self):
        """homeIphoneCasesListView

        Function that returns the cases that contain
        the entered character string, searches by title and author names

        Author : Adrian Crespo Musheghyan
        """
        searchString = self.request.GET.get('q', '')
        query = (Q(name__icontains=searchString))
        cases = IphoneCase.objects.filter(query).order_by('name').distinct()

        return cases


""" Another implementation
def homeIphoneCasesSearchView(request):
    if request.method == 'GET':
        searchString = request.GET.get('q', '')
        query = (Q(title__icontains=searchString) | Q(
            author__last_name__icontains=searchString) |
            Q(author__first_name__icontains=searchString))
        cases = IphoneCase.objects.filter(query)
        page_number = request.GET.get('page')
        paginator = Paginator(cases, 5)
        cases_page = paginator.get_page(page_number)

        template_name = 'search.html'
        context = {'cases': cases_page, 'searchString': searchString, }
    return render(request, template_name, context)
"""


def detail(request, slug):
    """detail

    Function that shows the details of a case

       Args:
           slug : Wanted case slug

    Author : Adrian Crespo Musheghyan
    """
    cases = IphoneCase.objects.filter(slug=slug)

    if(cases.exists()):
        cases = cases.first()
    else:
        return render(request, "error404.html")

    formQuantity = CartAddIphoneCaseForm()

    comments_case = Comment.objects.filter(case_id=cases)
    template_name = 'detail.html'
    context = {'case': cases, 'comment': comments_case,
               'formQuantity': formQuantity, }

    return render(request, template_name, context)



@login_required
def add_comment(request):
    # Obtener la funda específica
    iphone_case = IphoneCase.objects.filter(id = request.POST.get('case_id'))
    iphone_case_obj = get_object_or_404(IphoneCase, id=request.POST.get('case_id'))
    if request.method == "POST":
        # Obtener el comentario desde el formulario
        message = request.POST.get('message')

        if message:
            # Crear y guardar el comentario
            comment = Comment.objects.create(
                user=request.user,
                case=iphone_case_obj,
                msg=message
            )
            comment.save()
            return redirect('detail', slug=iphone_case_obj.slug)  # Redirige a la página de detalles de la funda

        return HttpResponse("Invalid input", status=400)

    return render(request, 'add_comment.html', {'iphone_case': iphone_case})



def pag_error404(request, exception):
    """Overwrites 404 error

    Author : Adrian Crespo Musheghyan
    """
    response = render(request, "error404.html")
    response.status_code = 404
    return response


def pag_error500(request):
    """Overwrites 500 error

    Author : Adrian Crespo Musheghyan
    """
    response = render(request, "error500.html")
    response.status_code = 500
    return response
